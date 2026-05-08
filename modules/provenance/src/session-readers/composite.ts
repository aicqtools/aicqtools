import type { SessionReader, SessionReaderResult } from './types.js';

export class CompositeSessionReader implements SessionReader {
  readonly id: string;
  private readonly readers: readonly SessionReader[];

  constructor(readers: readonly SessionReader[], id = 'composite') {
    this.readers = readers;
    this.id = id;
  }

  async read(cwd: string): Promise<SessionReaderResult> {
    const results = await Promise.all(
      this.readers.map((r) =>
        r.read(cwd).catch(() => ({ sessions: [], prompts: [] }) as SessionReaderResult),
      ),
    );
    return {
      sessions: results.flatMap((r) => r.sessions),
      prompts: results.flatMap((r) => r.prompts),
    };
  }
}
