import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  ClaudeCodeSessionReader,
  CompositeSessionReader,
  CursorSessionReader,
  ManualSessionReader,
  createReader,
  encodeClaudeProjectId,
  getCursorWorkspaceStorageDir,
} from '../session-readers/index.js';
import type { SessionReader, SessionReaderResult } from '../session-readers/index.js';

describe('encodeClaudeProjectId', () => {
  it('replaces colons, slashes, and spaces with dashes', () => {
    const cwd = process.platform === 'win32' ? 'd:\\AI\\Claude Data\\test' : '/AI/Claude Data/test';
    const result = encodeClaudeProjectId(cwd);
    expect(result).not.toMatch(/[:\\/\s]/);
    expect(result).toContain('AI');
    expect(result).toContain('Claude');
    expect(result).toContain('Data');
    expect(result).toContain('test');
  });

  it('produces stable output for the same input', () => {
    const cwd = process.cwd();
    expect(encodeClaudeProjectId(cwd)).toBe(encodeClaudeProjectId(cwd));
  });
});

describe('getCursorWorkspaceStorageDir', () => {
  it('returns null on Windows when APPDATA missing', () => {
    expect(getCursorWorkspaceStorageDir({ home: '/home/u', platform: 'win32' })).toBeNull();
  });

  it('returns Windows path when APPDATA present', () => {
    const result = getCursorWorkspaceStorageDir({
      home: '/home/u',
      platform: 'win32',
      appData: 'C:\\Users\\u\\AppData\\Roaming',
    });
    expect(result).toMatch(/Cursor.User.workspaceStorage$/);
  });

  it('returns macOS path', () => {
    const result = getCursorWorkspaceStorageDir({ home: '/Users/u', platform: 'darwin' });
    expect(result).toBe('/Users/u/Library/Application Support/Cursor/User/workspaceStorage');
  });

  it('returns Linux path', () => {
    const result = getCursorWorkspaceStorageDir({ home: '/home/u', platform: 'linux' });
    expect(result).toBe('/home/u/.config/Cursor/User/workspaceStorage');
  });
});

describe('ClaudeCodeSessionReader', () => {
  let tmpHome: string;

  beforeEach(async () => {
    tmpHome = await mkdtemp(join(tmpdir(), 'aicq-claude-'));
  });

  afterEach(async () => {
    await rm(tmpHome, { recursive: true, force: true });
  });

  it('returns empty when project directory is missing', async () => {
    const reader = new ClaudeCodeSessionReader({ homeDir: tmpHome });
    const result = await reader.read(process.cwd());
    expect(result).toEqual({ sessions: [], prompts: [] });
  });

  it('parses a jsonl file with user and assistant messages and extracts model', async () => {
    const cwd = process.cwd();
    const projectDir = join(tmpHome, '.claude', 'projects', encodeClaudeProjectId(cwd));
    await mkdir(projectDir, { recursive: true });
    const lines = [
      JSON.stringify({
        type: 'user',
        sessionId: 'sess-a',
        timestamp: '2026-05-08T10:00:00Z',
        version: '2.1.132',
        message: { role: 'user', content: [{ type: 'text', text: 'Hello aicq' }] },
      }),
      JSON.stringify({
        type: 'assistant',
        sessionId: 'sess-a',
        timestamp: '2026-05-08T10:01:00Z',
        message: {
          role: 'assistant',
          model: 'claude-opus-4-7',
          content: [{ type: 'text', text: 'Hi' }],
        },
      }),
    ];
    await writeFile(join(projectDir, 'sess-a.jsonl'), lines.join('\n'));

    const reader = new ClaudeCodeSessionReader({ homeDir: tmpHome });
    const result = await reader.read(cwd);
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0]?.sessionId).toBe('sess-a');
    expect(result.sessions[0]?.tool).toBe('claude-code');
    expect(result.sessions[0]?.model).toBe('claude-opus-4-7');
    expect(result.sessions[0]?.modelVersion).toBe('2.1.132');
    expect(result.sessions[0]?.startedAt).toBe('2026-05-08T10:00:00Z');
    expect(result.sessions[0]?.endedAt).toBe('2026-05-08T10:01:00Z');
    expect(result.prompts).toHaveLength(1);
    expect(result.prompts[0]?.prompt).toBe('Hello aicq');
  });

  it('falls back to "unknown" model when no assistant message is present', async () => {
    const cwd = process.cwd();
    const projectDir = join(tmpHome, '.claude', 'projects', encodeClaudeProjectId(cwd));
    await mkdir(projectDir, { recursive: true });
    const line = JSON.stringify({
      type: 'user',
      sessionId: 'sess-no-asst',
      timestamp: '2026-05-08T10:00:00Z',
      message: { role: 'user', content: [{ type: 'text', text: 'a' }] },
    });
    await writeFile(join(projectDir, 'sess-no-asst.jsonl'), line);

    const reader = new ClaudeCodeSessionReader({ homeDir: tmpHome });
    const result = await reader.read(cwd);
    expect(result.sessions[0]?.model).toBe('unknown');
  });

  it('skips ide_opened_file and system-reminder text fragments', async () => {
    const cwd = process.cwd();
    const projectDir = join(tmpHome, '.claude', 'projects', encodeClaudeProjectId(cwd));
    await mkdir(projectDir, { recursive: true });
    const line = JSON.stringify({
      type: 'user',
      sessionId: 'sess-b',
      timestamp: '2026-05-08T10:00:00Z',
      message: {
        role: 'user',
        content: [
          { type: 'text', text: '<ide_opened_file>some.md</ide_opened_file>' },
          { type: 'text', text: '<system-reminder>cache</system-reminder>' },
          { type: 'text', text: 'real prompt' },
        ],
      },
    });
    await writeFile(join(projectDir, 'sess-b.jsonl'), line);

    const reader = new ClaudeCodeSessionReader({ homeDir: tmpHome });
    const result = await reader.read(cwd);
    expect(result.prompts).toHaveLength(1);
    expect(result.prompts[0]?.prompt).toBe('real prompt');
  });

  it('skips invalid jsonl lines without throwing', async () => {
    const cwd = process.cwd();
    const projectDir = join(tmpHome, '.claude', 'projects', encodeClaudeProjectId(cwd));
    await mkdir(projectDir, { recursive: true });
    const lines = [
      'not json',
      JSON.stringify({
        type: 'user',
        sessionId: 'sess-c',
        timestamp: '2026-05-08T10:00:00Z',
        message: { role: 'user', content: [{ type: 'text', text: 'OK' }] },
      }),
    ];
    await writeFile(join(projectDir, 'sess-c.jsonl'), lines.join('\n'));

    const reader = new ClaudeCodeSessionReader({ homeDir: tmpHome });
    const result = await reader.read(cwd);
    expect(result.sessions).toHaveLength(1);
    expect(result.prompts).toHaveLength(1);
  });
});

describe('CursorSessionReader', () => {
  let tmpHome: string;

  beforeEach(async () => {
    tmpHome = await mkdtemp(join(tmpdir(), 'aicq-cursor-'));
  });

  afterEach(async () => {
    await rm(tmpHome, { recursive: true, force: true });
  });

  it('returns empty when workspaceStorage missing', async () => {
    const reader = new CursorSessionReader({
      home: tmpHome,
      platformOverride: 'linux',
    });
    const result = await reader.read('/whatever');
    expect(result).toEqual({ sessions: [], prompts: [] });
  });

  it('detects Cursor usage when state.vscdb exists', async () => {
    const wsDir = join(tmpHome, '.config', 'Cursor', 'User', 'workspaceStorage', 'workspace-1');
    await mkdir(wsDir, { recursive: true });
    await writeFile(join(wsDir, 'state.vscdb'), 'sqlite-stub');

    const reader = new CursorSessionReader({
      home: tmpHome,
      platformOverride: 'linux',
    });
    const result = await reader.read('/whatever');
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0]?.tool).toBe('cursor');
    expect(result.sessions[0]?.sessionId).toMatch(/^cursor-detected-/);
    expect(result.prompts).toEqual([]);
  });
});

describe('ManualSessionReader', () => {
  it('reads .aicq/sessions.json from cwd', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'aicq-manual-'));
    try {
      await mkdir(join(tmp, '.aicq'), { recursive: true });
      await writeFile(
        join(tmp, '.aicq', 'sessions.json'),
        JSON.stringify({
          sessions: [
            {
              sessionId: 'm1',
              tool: 'claude-code',
              model: 'manual',
              startedAt: '2026-05-08T10:00:00Z',
            },
          ],
          prompts: [],
        }),
      );
      const reader = new ManualSessionReader();
      const result = await reader.read(tmp);
      expect(result.sessions).toHaveLength(1);
      expect(result.sessions[0]?.sessionId).toBe('m1');
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });
});

describe('CompositeSessionReader', () => {
  it('merges results from multiple readers', async () => {
    const r1: SessionReader = {
      id: 'r1',
      async read(): Promise<SessionReaderResult> {
        return {
          sessions: [
            {
              sessionId: 's1',
              tool: 'claude-code',
              model: 'm',
              startedAt: '2026-05-08T10:00:00Z',
            },
          ],
          prompts: [],
        };
      },
    };
    const r2: SessionReader = {
      id: 'r2',
      async read(): Promise<SessionReaderResult> {
        return {
          sessions: [
            {
              sessionId: 's2',
              tool: 'cursor',
              model: 'm',
              startedAt: '2026-05-08T10:00:00Z',
            },
          ],
          prompts: [],
        };
      },
    };
    const composite = new CompositeSessionReader([r1, r2]);
    const result = await composite.read('/cwd');
    expect(result.sessions).toHaveLength(2);
    expect(result.sessions.map((s) => s.sessionId).sort()).toEqual(['s1', 's2']);
  });

  it('swallows reader errors and continues', async () => {
    const ok: SessionReader = {
      id: 'ok',
      async read(): Promise<SessionReaderResult> {
        return {
          sessions: [
            {
              sessionId: 'ok',
              tool: 'claude-code',
              model: 'm',
              startedAt: '2026-05-08T10:00:00Z',
            },
          ],
          prompts: [],
        };
      },
    };
    const broken: SessionReader = {
      id: 'broken',
      async read(): Promise<SessionReaderResult> {
        throw new Error('boom');
      },
    };
    const composite = new CompositeSessionReader([ok, broken]);
    const result = await composite.read('/cwd');
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0]?.sessionId).toBe('ok');
  });
});

describe('createReader factory', () => {
  it('returns the right reader id', () => {
    expect(createReader('manual').id).toBe('manual');
    expect(createReader('claude-code').id).toBe('claude-code');
    expect(createReader('cursor').id).toBe('cursor');
    expect(createReader('all').id).toBe('all');
  });
});
