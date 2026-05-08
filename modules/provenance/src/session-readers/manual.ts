import { readActiveSessions } from '../git-hook/session-source.js';
import type { SessionReader, SessionReaderResult } from './types.js';

export class ManualSessionReader implements SessionReader {
  readonly id = 'manual';

  async read(cwd: string): Promise<SessionReaderResult> {
    return readActiveSessions(cwd);
  }
}
