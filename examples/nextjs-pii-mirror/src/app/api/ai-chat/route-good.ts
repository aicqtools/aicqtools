/**
 * 정상 패턴 — 같은 시나리오를 룰 위반 없이 구현하는 방법.
 *
 *   - lib/llm-client.ts의 사내 싱글톤 사용 (no-direct-openai 통과)
 *   - PII 마스킹 후 AI 호출 (mask-pii-in-ai-prompt 통과)
 *   - decision audit logger 통합 (audit-log-ai-decision 통과)
 *   - dayjs/luxon로 Asia/Seoul 명시 (explicit-kst-timezone 통과)
 *
 * 이 파일은 룰이 적중하지 않아야 하는 baseline입니다.
 */

import { llmClient } from '@/lib/llm-client';
import { auditAiDecision } from '@/lib/audit-logger';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(timezone);

/**
 * client는 평문 PII를 절대 보내지 않는다 — vault/payment-gateway에서 발급된 토큰
 * 참조만 보낸다 (PCI DSS § 3.5.1, 금감원 AI 가이드라인).
 */
interface ChatRequest {
  userMessage: string;
  residentNumberRef: string; // 토큰화된 RRN 참조 (사내 vault id)
  cardTokenRef_encrypted: string; // PCI DSS § 3.5.1 — 토큰화된 카드 참조
}

declare const NextResponse: { json(body: unknown): { headers: Headers; status: number } };

export async function POST(req: Request): Promise<{ status: number }> {
  const body = (await req.json()) as ChatRequest;

  // prompt에는 토큰 참조만 들어감 — PII 평문은 서버를 통과하지 않음.
  const prompt = `사용자 질문: ${body.userMessage} (rrnRef=${body.residentNumberRef}, cardRef=${body.cardTokenRef_encrypted})`;

  const response = await llmClient.chat({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
  });

  await auditAiDecision({
    decisionType: 'ai-chat',
    model: 'gpt-4',
    inputHash: hash(prompt),
    output: response.text,
    at: dayjs().tz('Asia/Seoul').toISOString(),
  });

  return NextResponse.json({ text: response.text });
}

declare function hash(input: string): string;
