# Marketing — 사전 게시 자료

aicqtools v1.0-alpha 출시 전·후 한국 IT 커뮤니티에 평판 빌딩하기 위한 게시 자료 초안 모음. 모두 **사용자(소장님)가 직접 게시**합니다 — 자동 게시 봇 없음.

## 자료 일람

| 채널 | 파일 | 톤 / 길이 | 권장 게시 시점 |
|------|------|---------|---------------|
| GeekNews | [geeknews-launch.md](geeknews-launch.md) | 짧고 임팩트 (200~400자), HN 스타일 | 1차 — 가장 먼저 |
| OKKY | [okky-launch.md](okky-launch.md) | 토론형 + Q&A (~1000자), 캐주얼 | 2차 — GeekNews 후 1~2일 |
| Velog | [velog-launch.md](velog-launch.md) | 긴 기술 블로그 (3000~5000자), 코드 + 분석 | 3차 — 후속 long-tail 트래픽 |
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

## 핵심 메시지 (모든 채널 공통)

1. **"AI가 짠 코드를 같은 LLM 계열로 검증하면 같은 맹점을 공유한다"** — 결정론적 가드레일이 필요한 이유
2. **빌트인 룰 50개 — 한국 도메인 20개 포함** — 글로벌 도구가 흉내 못 내는 영역 (금감원 AI / PCI DSS / 한국 IT 컨벤션)
3. **MCP 네이티브 — 코드 생성 *전* 차단** — 사후 검증이 아닌 사전
4. **EU AI Act Article 50 한·영 HTML/PDF 리포트** — 시행일 2026-08-02 직격
5. **205,069 LOC 한국 상용 모노레포 케이스 스터디** — 7개 핵심 AI 바이브코딩 패턴 정형화
6. **MIT OSS, repo당 $19/₩29,000** — Semgrep Team $35 × 인원 모델 대비

## 피해야 할 메시지

- "Codacy / Greptile은 별로다" — 부정 비교 자제. 트레이드오프로 표현
- "AI가 만든 코드 다 못 믿는다" — 자극적. "결정론적 검증의 필요성"으로
- "한국이 글로벌보다 우수하다" — 한국 도메인 룰셋의 차별화 포인트만 강조
- "이거 하나로 모든 보안 문제 해결" — 과장. ESLint + Snyk + aicq 보완 관계

## 답글 템플릿

GeekNews / OKKY 댓글에 자주 받을 질문 + 답변 템플릿은 각 launch.md 파일의 **예상 질문 / 대답 준비** 섹션에 정리되어 있습니다.

## 게시 후 모니터링

- GitHub Stars / Issues / PR 트래픽 (사용자 직접 GitHub 통계 확인)
- npm 다운로드 (v1.0 정식 출시 후 — npm publish는 Phase 1b 후반)
- 평가 댓글 / 우려 사항 → CHANGELOG / Roadmap 반영

## 다음 단계

마케팅 콘텐츠 게시 → 피드백 수렴 → **v1.0.0-alpha.2 또는 v1.0.0-beta.1** 태그 + 실제 npm publish (E4-B). 이 시점에 README 배지에 npm version + downloads 추가.
