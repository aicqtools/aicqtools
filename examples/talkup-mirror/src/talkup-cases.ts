/**
 * 케이스 스터디용 익명화 샘플 (talkup-30k.md / .en.md 본문과 1:1 매칭).
 * 추천 문서가 정리한 TalkUp 7개 패턴을 위반 형태로 작성 — aicq check에서
 * 모두 검출되어야 합니다.
 *
 * Anonymized samples — see docs/case-studies/talkup-30k(.en).md.
 * Each block intentionally violates one of the seven recurring patterns;
 * `aicq check` should report a diagnostic for each.
 */

// Case 1 — direct OpenAI instantiation (no-direct-openai)
import OpenAI from 'openai';
const _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Case 2 — console.log left in production code (no-console-log)
export function caseLogger(user: { id: string; token: string }): void {
  console.log('user', user, 'token', user.token);
}

// Case 3 — id namespace overwrite (no-id-overwrite)
export function caseIdOverwrite(user: { id: number; publicId: string; name: string }) {
  return { ...user, id: user.publicId };
}

// Case 4 — new route without rateLimit middleware (route-needs-rate-limit)
declare const router: {
  post(path: string, ...handlers: Array<(req: unknown, res: unknown) => unknown>): void;
};
router.post('/api/feedback', async (_req, _res) => {
  /* missing rateLimit */
});

// Case 5 — async handler without asyncWrapper (controller-needs-async-wrapper)
router.post('/api/foo', async (_req, _res) => {
  await Promise.resolve();
});

// Case 6 — FK without onDelete policy (fk-needs-on-delete)
declare const queryInterface: {
  createTable(name: string, schema: Record<string, unknown>): Promise<void>;
};
await queryInterface.createTable('comments', {
  user_id: {
    type: 'INTEGER',
    references: { model: 'users', key: 'id' },
  },
});

// Case 7 — inconsistent API response shape (api-response-shape)
declare const res: { json(body: unknown): void };
res.json({ result: [{ id: 1 }] });
