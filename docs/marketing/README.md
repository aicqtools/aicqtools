# Marketing — 사전 게시 자료

aicqtools v1.0.0-beta.2 발화(2026-05-27 Day 0 GeekNews) 전·후 한국 IT 커뮤니티에 평판 빌딩하기 위한 게시 자료 초안 모음. 모두 **사용자(소장님)가 직접 게시**합니다 — 자동 게시 봇 없음.

## 자료 일람

| 채널 | 파일 | 톤 / 길이 | 권장 게시 시점 |
|------|------|---------|---------------|
| GeekNews | [geeknews-launch.md](geeknews-launch.md) | 짧고 임팩트 (200~400자), HN 스타일 | 1차 — 가장 먼저 |
| OKKY | [okky-launch.md](okky-launch.md) | 토론형 + Q&A (~1000자), 캐주얼 | 2차 — GeekNews 후 1~2일 |
| Velog | [velog-launch.md](velog-launch.md) | 긴 기술 블로그 (3000~5000자), 코드 + 분석 | 3차 — 후속 long-tail 트래픽 |
| Velog 보조 / dev.to | [blog-vs-ai-assistant.ko.md](blog-vs-ai-assistant.ko.md) + [.en.md](blog-vs-ai-assistant.en.md) | 정량 비교·표 중심 (한 5-8K자 / 영 4-7K자) | D+4~D+7 (Velog 본글 후 long-tail · 댓글 응대 링크) |
| GitHub Discussions | [discussions-welcome.md](discussions-welcome.md) | 활성화 가이드 + 핀 글 본문 (한·영) | 발화 전 (5/26 일요일까지) |

## 게시 순서 권장

```
Day 0  (월요일 아침)  → GeekNews 게시
Day 0  (저녁)         → 댓글 1차 답변
Day 1                 → 댓글 2차 답변 + 추가 컨텍스트
Day 2  (수요일)       → OKKY 게시 (다른 톤, GeekNews 본 분들 일부 OKKY로 유입)
Day 4~5 (금요일)      → Velog 긴 기술 블로그 (long-tail SEO)
Day 7~                → ProductHunt 글로벌 런칭 검토 (Phase 2 v1.5 출시 시점)
```

## 핵심 메시지 (모든 채널 공통, 우선순위순)

1. **AI 코드 어시스턴트 PR 노이즈 차단** — 한국 IT 컨벤션·금감원·PCI DSS 위반을 머지 *전* hard gate. 시니어 PR 리뷰 시간 손실이 진짜 비용.
2. **한국 도메인 룰 20개 (글로벌 도구 비대체)** — 한국 IT 컨벤션 7 + 금감원 AI 가이드라인 5 + PCI DSS 8. CodeRabbit/Codacy/SonarQube/ESLint AI 모두 0개.
3. **결정론적 + MCP 네이티브** — 같은 LLM 계열이 코드를 만들고 검증까지 하면 같은 맹점 공유 → tree-sitter AST 결정론. MCP 등록 시 코드 생성 *전* 차단.
4. **205,069 LOC 한국 상용 모노레포 dogfooding** — TalkUp + Next.js with-typescript + Nest.js typescript-starter 외부 dogfood까지 확인 (G1 게이트 2/2 충족).
5. **MIT OSS 영구 무료** — 유료 구독(클라우드 대시보드 등 부가 기능)은 v1.5 공개 시점에 결정 예정.
6. **EU AI Act Article 50 transparency 마킹 보조** — 시행일 2026-08-02 대응, future-proofing (직접 적용 대상은 provider/deployer로 한정).

## 피해야 할 메시지

- "Codacy / Greptile은 별로다" — 부정 비교 자제. 트레이드오프로 표현
- "AI가 만든 코드 다 못 믿는다" — 자극적. "결정론적 검증의 필요성"으로
- "한국이 글로벌보다 우수하다" — 한국 도메인 룰셋의 차별화 포인트만 강조
- "이거 하나로 모든 보안 문제 해결" — 과장. ESLint + Snyk + aicq 보완 관계
- **"EU AI Act 검증 의무 / verification mandatory"** — EU AI Act Article 50은 transparency 마킹·공개 의무이지 검증 의무 아님. "Article 50 마킹 보조" "transparency 의무 대응" 표현 사용
- **AI 도구 vendor 이름 단독 나열** (실수요자 정의·마케팅 카피) — "Cursor/Claude Code를 쓰는 팀" 대신 "AI 코드 어시스턴트(Cursor, Claude Code 등)" 카테고리명 우선. 기능 통합 사실 묘사(MCP 등록 등)에서는 vendor명 허용

## 답글 템플릿

GeekNews / OKKY 댓글에 자주 받을 질문 + 답변 템플릿은 각 launch.md 파일의 **예상 질문 / 대답 준비** 섹션에 정리되어 있습니다.

## 게시 후 모니터링

- GitHub Stars / Issues / PR 트래픽 (사용자 직접 GitHub 통계 확인)
- npm 다운로드 — `.github/workflows/monitor-npm.yml`이 매주 월요일 09:00 KST에 자동 측정해 GitHub Issue로 보고 (G2 게이트 ≥ 200/주 추적)
- 평가 댓글 / 우려 사항 → `docs/policy/issue-triage.md` P0/P1/P2/P3 분류 → CHANGELOG / ROADMAP 반영

## 다음 단계

베타.2 발화(2026-05-27 Day 0) → 피드백 수렴 → 베타 soak → **1.0.0 stable** 진입 (G1~G4 게이트 충족 시). G1 외부 dogfood 2/2 + G4 베타 soak 2 cycle 무중단은 이미 충족, G2(npm DL ≥ 200/주) + G3(P1 미해결 0)이 남은 게이트.
