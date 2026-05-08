import type { AiSession, AiPromptRecord } from '../types.js';

export interface SessionReaderResult {
  readonly sessions: readonly AiSession[];
  readonly prompts: readonly AiPromptRecord[];
}

export interface SessionReader {
  readonly id: string;
  read(cwd: string): Promise<SessionReaderResult>;
}
