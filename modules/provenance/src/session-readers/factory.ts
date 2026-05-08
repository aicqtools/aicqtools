import { ClaudeCodeSessionReader } from './claude-code.js';
import { CompositeSessionReader } from './composite.js';
import { CursorSessionReader } from './cursor.js';
import { ManualSessionReader } from './manual.js';
import type { SessionReader } from './types.js';

export type ReaderName = 'manual' | 'claude-code' | 'cursor' | 'all';

export function createReader(name: ReaderName): SessionReader {
  switch (name) {
    case 'manual':
      return new ManualSessionReader();
    case 'claude-code':
      return new ClaudeCodeSessionReader();
    case 'cursor':
      return new CursorSessionReader();
    case 'all':
      return new CompositeSessionReader(
        [new ManualSessionReader(), new ClaudeCodeSessionReader(), new CursorSessionReader()],
        'all',
      );
  }
}
