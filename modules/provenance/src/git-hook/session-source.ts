import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { AiSession, AiPromptRecord } from '../types.js';

/**
 * Session source: where to read the active AI session from.
 *
 * Phase 0 PoC reads `.aicq/sessions.json` — a simple JSON file the user (or a
 * future IDE plugin) maintains. Phase 1a will add native readers for
 * Claude Code's `~/.claude/projects/<id>/<session>.jsonl` and Cursor's
 * session storage.
 */

interface SessionsFile {
  sessions?: AiSession[];
  prompts?: AiPromptRecord[];
}

export async function readActiveSessions(cwd: string): Promise<{
  sessions: AiSession[];
  prompts: AiPromptRecord[];
}> {
  const path = resolve(cwd, '.aicq/sessions.json');
  if (!existsSync(path)) return { sessions: [], prompts: [] };
  try {
    const raw = await readFile(path, 'utf-8');
    const parsed = JSON.parse(raw) as SessionsFile;
    return {
      sessions: parsed.sessions ?? [],
      prompts: parsed.prompts ?? [],
    };
  } catch {
    return { sessions: [], prompts: [] };
  }
}

export function findClosestSession(
  sessions: readonly AiSession[],
  timestamp: string,
): AiSession | null {
  if (sessions.length === 0) return null;
  const target = Date.parse(timestamp);
  let best: AiSession | null = null;
  let bestDelta = Infinity;
  for (const s of sessions) {
    const start = Date.parse(s.startedAt);
    if (Number.isNaN(start)) continue;
    const end = s.endedAt ? Date.parse(s.endedAt) : Date.now();
    const delta = target >= start && target <= end ? 0 : Math.min(Math.abs(target - start), Math.abs(target - end));
    if (delta < bestDelta) {
      bestDelta = delta;
      best = s;
    }
  }
  return best;
}
