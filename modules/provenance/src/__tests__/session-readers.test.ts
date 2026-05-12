import Database from 'better-sqlite3';
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
  getCursorGlobalStorageDir,
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

describe('getCursorGlobalStorageDir', () => {
  it('returns null on Windows when APPDATA missing', () => {
    expect(getCursorGlobalStorageDir({ home: '/home/u', platform: 'win32' })).toBeNull();
  });

  it('returns the globalStorage sibling of workspaceStorage', () => {
    expect(getCursorGlobalStorageDir({ home: '/home/u', platform: 'linux' })).toBe(
      '/home/u/.config/Cursor/User/globalStorage',
    );
    expect(getCursorGlobalStorageDir({ home: '/Users/u', platform: 'darwin' })).toBe(
      '/Users/u/Library/Application Support/Cursor/User/globalStorage',
    );
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

  const linuxReader = (): CursorSessionReader =>
    new CursorSessionReader({ home: tmpHome, platformOverride: 'linux' });

  async function makeWorkspaceDb(name: string, seed: (db: Database.Database) => void): Promise<void> {
    const wsDir = join(tmpHome, '.config', 'Cursor', 'User', 'workspaceStorage', name);
    await mkdir(wsDir, { recursive: true });
    const db = new Database(join(wsDir, 'state.vscdb'));
    try {
      db.exec('CREATE TABLE ItemTable (key TEXT PRIMARY KEY, value TEXT)');
      seed(db);
    } finally {
      db.close();
    }
  }

  async function makeGlobalDb(seed: (db: Database.Database) => void): Promise<void> {
    const gsDir = join(tmpHome, '.config', 'Cursor', 'User', 'globalStorage');
    await mkdir(gsDir, { recursive: true });
    const db = new Database(join(gsDir, 'state.vscdb'));
    try {
      db.exec('CREATE TABLE ItemTable (key TEXT PRIMARY KEY, value TEXT)');
      db.exec('CREATE TABLE cursorDiskKV (key TEXT PRIMARY KEY, value TEXT)');
      seed(db);
    } finally {
      db.close();
    }
  }

  it('returns empty when workspaceStorage missing', async () => {
    const result = await linuxReader().read('/whatever');
    expect(result).toEqual({ sessions: [], prompts: [] });
  });

  it('falls back to detection-only when state.vscdb is not a SQLite file', async () => {
    const wsDir = join(tmpHome, '.config', 'Cursor', 'User', 'workspaceStorage', 'workspace-1');
    await mkdir(wsDir, { recursive: true });
    await writeFile(join(wsDir, 'state.vscdb'), 'sqlite-stub');

    const result = await linuxReader().read('/whatever');
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0]?.tool).toBe('cursor');
    expect(result.sessions[0]?.sessionId).toMatch(/^cursor-detected-/);
    expect(result.prompts).toEqual([]);
  });

  it('extracts prompts from ItemTable chatdata tabs/bubbles', async () => {
    await makeWorkspaceDb('ws-a', (db) => {
      db.prepare('INSERT INTO ItemTable (key, value) VALUES (?, ?)').run(
        'workbench.panel.aichat.view.aichat.chatdata',
        JSON.stringify({
          tabs: [
            {
              tabId: 't1',
              lastSendTime: 1715000000000,
              bubbles: [
                { type: 'user', text: 'fix the bug' },
                { type: 'ai', text: 'done', modelType: 'gpt-4o' },
                { type: 'user', text: 'add a test' },
                { type: 'ai', text: 'added', modelType: 'gpt-4o' },
              ],
            },
          ],
        }),
      );
    });

    const result = await linuxReader().read('/whatever');
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0]?.sessionId).toBe('cursor-t1');
    expect(result.sessions[0]?.tool).toBe('cursor');
    expect(result.sessions[0]?.model).toBe('gpt-4o');
    expect(result.prompts).toHaveLength(2);
    expect(result.prompts[0]?.prompt).toBe('fix the bug');
    expect(result.prompts[0]?.response).toBe('done');
    expect(result.prompts[1]?.prompt).toBe('add a test');
  });

  it('extracts prompts from an aiService.prompts array', async () => {
    await makeWorkspaceDb('ws-b', (db) => {
      db.prepare('INSERT INTO ItemTable (key, value) VALUES (?, ?)').run(
        'aiService.prompts',
        JSON.stringify([
          { text: 'p1', commandType: 4 },
          { text: 'p2', commandType: 4 },
        ]),
      );
    });

    const result = await linuxReader().read('/whatever');
    expect(result.prompts.map((p) => p.prompt)).toEqual(['p1', 'p2']);
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0]?.tool).toBe('cursor');
  });

  it('falls back to detection-only on broken / unrecognized chat payload', async () => {
    await makeWorkspaceDb('ws-c', (db) => {
      const ins = db.prepare('INSERT INTO ItemTable (key, value) VALUES (?, ?)');
      ins.run('workbench.panel.aichat.view.aichat.chatdata', '{ not json');
      ins.run('composer.composerData', JSON.stringify({ somethingUnknown: true }));
    });

    const result = await linuxReader().read('/whatever');
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0]?.sessionId).toMatch(/^cursor-detected-/);
    expect(result.prompts).toEqual([]);
  });

  it('extracts prompts from global cursorDiskKV composerData with inline conversation', async () => {
    await makeGlobalDb((db) => {
      db.prepare('INSERT INTO cursorDiskKV (key, value) VALUES (?, ?)').run(
        'composerData:11111111-1111-1111-1111-111111111111',
        JSON.stringify({
          composerId: '11111111-1111-1111-1111-111111111111',
          createdAt: 1715000000000,
          conversation: [
            { type: 1, text: 'refactor this module', bubbleId: 'b1' },
            { type: 2, text: 'refactored', bubbleId: 'b2' },
          ],
        }),
      );
    });

    const result = await linuxReader().read('/whatever');
    expect(result.prompts).toHaveLength(1);
    expect(result.prompts[0]?.prompt).toBe('refactor this module');
    expect(result.prompts[0]?.response).toBe('refactored');
    expect(result.sessions[0]?.sessionId).toBe('cursor-11111111-1111-1111-1111-111111111111');
  });

  it('extracts prompts from global cursorDiskKV with split bubbleId rows', async () => {
    await makeGlobalDb((db) => {
      const cid = '22222222-2222-2222-2222-222222222222';
      const ins = db.prepare('INSERT INTO cursorDiskKV (key, value) VALUES (?, ?)');
      ins.run(
        `composerData:${cid}`,
        JSON.stringify({
          composerId: cid,
          fullConversationHeadersOnly: [
            { bubbleId: 'bb1', type: 1 },
            { bubbleId: 'bb2', type: 2 },
          ],
        }),
      );
      ins.run(`bubbleId:${cid}:bb1`, JSON.stringify({ type: 1, text: 'write docs' }));
      ins.run(`bubbleId:${cid}:bb2`, JSON.stringify({ type: 2, text: 'docs written' }));
    });

    const result = await linuxReader().read('/whatever');
    expect(result.prompts).toHaveLength(1);
    expect(result.prompts[0]?.prompt).toBe('write docs');
    expect(result.prompts[0]?.response).toBe('docs written');
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
