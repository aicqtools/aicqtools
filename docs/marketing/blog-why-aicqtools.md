# AI가 짠 코드, 그대로 배포해도 될까? — aicqtools 이야기

## 시작은 이런 장면입니다

AI 코드 어시스턴트(ChatGPT, Claude Code, Cursor 등)에 "결제 API 만들어줘" 한 줄 던지면 10초 안에 코드가 나옵니다. 문법은 맞고, 컴파일도 됩니다. 그런데 코드 안에는 이런 게 숨어 있어요.

- `console.log("user:", userData)` — 주민번호·카드번호가 그대로 로그에 찍힘
- `new Date()` — 시간대 명시 없음. 글로벌 서버에서 UTC로 돌다가 매출 마감이 9시간 어긋남
- `openai.chat.completions.create({ messages: [{ content: socialSecurityNumber }] })` — 사용자 주민번호가 ChatGPT 프롬프트로 흘러나감
- `res.download(filename)` — 파일명이 한글이면 다운로드 시 깨짐 (RFC 5987 미적용)

**Veracode 2025 보고서에 따르면 AI 생성 코드의 24.7~45%에 보안 결함이 있습니다.** Tenzai 2025 조사로는 AI가 자동으로 적용한 CSRF·보안 헤더는 **0%**예요. 즉, AI가 "잘 짜는 듯 보여도" 사람이 짚지 않으면 그대로 사고 납니다.

## 그럼 글로벌 도구를 쓰면 되지 않나요?

여기서 한국 팀의 특수성이 시작됩니다.

ESLint, SonarQube, Codacy, CodeRabbit — 다 좋은 도구지만 **글로벌 IT 관례만** 다룹니다. 한국에서 운영되는 서비스가 정말 필요한 건 따로 있어요.

- **금감원 AI 가이드라인** — 주민번호 마스킹, AI 의사결정 감사 로그, 모델 버전 추적
- **한국 IT 컨벤션** — KST 시간대, 원화 천단위, 한글 파일명, 카카오·네이버 OAuth 패턴
- **PCI DSS** — 카드번호 평문 금지, 결제 멱등성, TLS 1.2+

공개 정보 기준으로 글로벌 도구는 이 영역의 빌트인 룰을 기본 제공하지 않습니다 (2026-05 시점).

## 비유로 풀면

이렇게 생각해보세요.

**KS마크**가 박힌 콘센트만 한국 220V 환경에서 안전하게 쓸 수 있죠. 미국 110V 가전을 그대로 꽂으면 고장나거나 불나요. 마찬가지로 한국에서 운영되는 서비스 코드는 "한국 환경 표준"을 따라야 하는데, 글로벌 도구는 110V용 검사기라 KS마크를 못 찍어줍니다.

**HACCP**은 식품 공장에서 어디서 식중독균이 들어올 수 있는지 공정 단계마다 미리 짚어서 막아요. 사고 난 뒤 수습이 아니라 사고 *전* 차단이 핵심. AI 코드에도 위해요소가 있어요 — 주민번호가 ChatGPT로 흘러감, AI가 대출 거절했는데 근거 기록 없음, OpenAI 모델 바꿨는데 추적 안 됨. **금감원 AI 가이드라인 5종**은 정확히 이 위해요소들을 룰로 만든 거예요.

**자동차 정기검사**처럼, aicqtools는 GitHub PR이 올라올 때마다 자동으로 검사를 돌립니다. 위반 있으면 머지 막힘. 위험한 코드가 절대 main에 안 들어가요.

## aicqtools가 하는 일

`@aicqtools/cli`(MIT OSS, npm)를 설치하면 50개 빌트인 룰이 들어옵니다.

- 한국 IT 컨벤션 7개 + 금감원 AI 가이드라인 5개 + PCI DSS 8개 + 글로벌 TS/Python 22개 + 도그푸드 8개
- 메시지 97.8%가 한국어 native. `aicq check --locale ko`로 100% 한글 출력
- **EU AI Act Article 50 transparency 마킹·출처 리포트** 한·영 HTML/PDF 생성 (시행 2026-08-02 대응 — 직접 적용 대상은 provider/deployer로 한정)
- MCP 네이티브 — AI 코드 어시스턴트(Claude Code, Cursor 등)에 MCP 서버로 등록하면 코드 생성 *전* 컨텍스트 주입
- 10K LOC 첫 검사 3초, 캐시 후 20ms

도그푸드 결과: 한국 핀테크 모노레포 TalkUp(205,069 LOC)에서 frontend 742 / backend 2,865 / admin 179건 위반 검출, 1.0.0-beta.2까지 0 regression. 외부 dogfood로 Next.js `with-typescript`(false positive 0건) + Nest.js `typescript-starter`(7 files / 2 violations) 추가 검증.

## 시작하기

```bash
npm install --save-dev @aicqtools/cli
npx aicq init --stack next
npx aicq check --locale ko
```

이 세 줄이면 30분 안에 첫 검사 결과를 볼 수 있어요.

---

*aicqtools는 MIT 오픈소스입니다. 한국 IT 컨벤션과 금감원 AI 가이드라인을 룰로 다루는 시도이고, 현재 베타 단계(v1.0.0-beta.2, 2026-05-22)예요.*
*저장소: [https://github.com/aicqtools/aicqtools](https://github.com/aicqtools/aicqtools) — OSS 공개 베타 (MIT 라이선스). npm: `@aicqtools/cli` (latest tag, 또는 `@beta`). CHANGELOG와 ROADMAP은 저장소 루트에서 확인 가능.*
