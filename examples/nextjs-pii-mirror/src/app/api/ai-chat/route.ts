/**
 * Next.js App Router — 금감원 AI 가이드라인 위반 패턴 미러.
 *
 * 의도적으로 다음 룰을 위반:
 *   - no-direct-openai      → OpenAI 클라이언트 직접 인스턴스화
 *   - mask-pii-in-ai-prompt → 마스킹 없이 주민번호/카드번호를 AI에 전달
 *   - audit-log-ai-decision → AI 의사결정에 감사 로그 없음
 *   - explicit-kst-timezone → new Date() 직접 사용 (KST 명시 누락)
 *
 * 정상 패턴은 ./route-good.ts 참조.
 */

import OpenAI from 'openai';

// no-direct-openai: 사내 정책상 LLM 클라이언트는 lib/llm-client.ts 싱글톤으로만 생성해야 함.
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ChatRequest {
  userMessage: string;
  residentNumber: string; // 예: '900101-1234567' — 마스킹 안 된 채로 들어옴
  cardNumber: string;     // 예: '4111 1111 1111 1111'
}

declare const NextResponse: { json(body: unknown): { headers: Headers; status: number } };

export async function POST(req: Request): Promise<{ status: number }> {
  const body = (await req.json()) as ChatRequest;

  // mask-pii-in-ai-prompt: 주민번호 \d{6}-\d{7} 패턴이 AI 호출 args에 그대로 들어감.
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'user',
        content: `사용자: ${body.userMessage} (주민번호 ${body.residentNumber}, 카드번호 ${body.cardNumber})`,
      },
    ],
  });

  // audit-log-ai-decision: AI 응답을 저장만 하고 결정 추적 로그를 안 남김.
  // explicit-kst-timezone: KST 명시 없는 new Date() — TalkUp 등 한국 SaaS는 Asia/Seoul 강제.
  const timestamp = new Date().toISOString();

  return NextResponse.json({
    text: response.choices[0]?.message.content,
    at: timestamp,
  });
}
