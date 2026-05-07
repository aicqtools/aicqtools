import { describe, it, expect } from 'vitest';
import { findClosestSession } from '../git-hook/session-source.js';
import type { AiSession } from '../types.js';

const sessions: AiSession[] = [
  {
    sessionId: 'a',
    tool: 'claude-code',
    model: 'claude-opus-4-7',
    startedAt: '2026-05-07T10:00:00Z',
    endedAt: '2026-05-07T10:30:00Z',
  },
  {
    sessionId: 'b',
    tool: 'cursor',
    model: 'gpt-5',
    startedAt: '2026-05-07T11:00:00Z',
    endedAt: '2026-05-07T11:30:00Z',
  },
];

describe('findClosestSession', () => {
  it('returns the session whose window contains the timestamp', () => {
    expect(findClosestSession(sessions, '2026-05-07T10:15:00Z')?.sessionId).toBe('a');
    expect(findClosestSession(sessions, '2026-05-07T11:15:00Z')?.sessionId).toBe('b');
  });

  it('returns the closest session by edge distance when outside windows', () => {
    expect(findClosestSession(sessions, '2026-05-07T10:45:00Z')?.sessionId).toBe('a');
    expect(findClosestSession(sessions, '2026-05-07T11:45:00Z')?.sessionId).toBe('b');
  });

  it('returns null on empty list', () => {
    expect(findClosestSession([], '2026-05-07T10:00:00Z')).toBeNull();
  });
});
