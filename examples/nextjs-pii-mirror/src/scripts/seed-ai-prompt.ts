/**
 * 테스트 시드 — 평문 주민번호/카드번호를 그대로 AI 호출에 넣는 안티패턴.
 * `mask-pii-in-ai-prompt` 룰이 리터럴 PII 패턴(\d{6}-\d{7}, 카드 15~16자리)을
 * AI SDK 호출의 args에서 검출합니다.
 *
 * 정상 패턴: PII는 운영 로그/시드 fixture에서도 절대 평문 사용 금지.
 * 토큰 ID 또는 합성 데이터로 대체하세요.
 */

import OpenAI from 'openai';

const openai = new OpenAI();

// mask-pii-in-ai-prompt 적중 — 인라인 리터럴 주민번호
await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: '사용자 주민번호: 900101-1234567 — 신용 평가 결과는?' }],
});

// mask-pii-in-ai-prompt 적중 — 인라인 리터럴 카드번호
await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: '카드 4111 1111 1111 1111 사용처 분석 부탁' }],
});
