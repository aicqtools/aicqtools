import { existsSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { homedir, platform } from 'node:os';
import { join, posix, win32 } from 'node:path';
import type { AiSession } from '../types.js';
import type { SessionReader, SessionReaderResult } from './types.js';

export interface CursorReaderOptions {
  readonly home?: string;
  readonly platformOverride?: NodeJS.Platform;
  readonly appDataOverride?: string;
  readonly maxWorkspaces?: number;
}

export function getCursorWorkspaceStorageDir(opts: {
  home: string;
  platform: NodeJS.Platform;
  appData?: string;
}): string | null {
  if (opts.platform === 'win32') {
    if (!opts.appData) return null;
    return win32.join(opts.appData, 'Cursor', 'User', 'workspaceStorage');
  }
  if (opts.platform === 'darwin') {
    return posix.join(opts.home, 'Library', 'Application Support', 'Cursor', 'User', 'workspaceStorage');
  }
  return posix.join(opts.home, '.config', 'Cursor', 'User', 'workspaceStorage');
}

/**
 * Detects Cursor usage by scanning workspaceStorage for `state.vscdb`.
 * Beta-lite scope: detection only — prompt extraction lands in v1.0 stable
 * when the SQLite schema stabilizes across Cursor versions.
 */
export class CursorSessionReader implements SessionReader {
  readonly id = 'cursor';
  private readonly home: string;
  private readonly platform: NodeJS.Platform;
  private readonly appData: string | undefined;
  private readonly maxWorkspaces: number;

  constructor(opts: CursorReaderOptions = {}) {
    this.home = opts.home ?? homedir();
    this.platform = opts.platformOverride ?? platform();
    this.appData = opts.appDataOverride ?? process.env['APPDATA'];
    this.maxWorkspaces = opts.maxWorkspaces ?? 50;
  }

  async read(_cwd: string): Promise<SessionReaderResult> {
    const dir = getCursorWorkspaceStorageDir({
      home: this.home,
      platform: this.platform,
      ...(this.appData ? { appData: this.appData } : {}),
    });
    if (!dir || !existsSync(dir)) return { sessions: [], prompts: [] };

    let workspaces: string[];
    try {
      workspaces = (await readdir(dir)).slice(0, this.maxWorkspaces);
    } catch {
      return { sessions: [], prompts: [] };
    }

    let mostRecent = 0;
    for (const ws of workspaces) {
      const dbPath = join(dir, ws, 'state.vscdb');
      if (!existsSync(dbPath)) continue;
      try {
        const m = await stat(dbPath);
        if (m.mtimeMs > mostRecent) mostRecent = m.mtimeMs;
      } catch {
        continue;
      }
    }

    if (mostRecent === 0) return { sessions: [], prompts: [] };

    const startedAt = new Date(mostRecent).toISOString();
    const session: AiSession = {
      sessionId: `cursor-detected-${mostRecent}`,
      tool: 'cursor',
      model: 'unknown',
      startedAt,
    };
    return { sessions: [session], prompts: [] };
  }
}
