import type { AiSession, AiPromptRecord, CodeAttribution } from '../types.js';
import { getStagedHunks } from './git.js';
import { findClosestSession, readActiveSessions } from './session-source.js';

export interface CaptureContext {
  readonly cwd: string;
  readonly commitTimestamp: string;
}

export interface CaptureResult {
  readonly sessions: readonly AiSession[];
  readonly prompts: readonly AiPromptRecord[];
  readonly attributions: readonly CodeAttribution[];
}

export async function capture(ctx: CaptureContext): Promise<CaptureResult> {
  const [{ sessions, prompts }, hunks] = await Promise.all([
    readActiveSessions(ctx.cwd),
    getStagedHunks(ctx.cwd),
  ]);

  const closest = findClosestSession(sessions, ctx.commitTimestamp);

  const attributions: CodeAttribution[] = hunks.map((h) => ({
    filePath: h.filePath,
    startLine: h.startLine,
    endLine: h.endLine,
    sessionId: closest?.sessionId ?? 'unknown',
    humanEdited: closest === null,
  }));

  return { sessions, prompts, attributions };
}
