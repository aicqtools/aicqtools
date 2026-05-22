# Issue triage policy — severity labels + SLA

본 문서는 aicqtools repo의 이슈 라벨 정책과 메인테이너 SLA를 정의합니다. ROADMAP의 **G3 게이트** (`severity:P1` 미해결 = 0) 추적의 근거.

## 1. Severity 정의

| 라벨 | 정의 | 예시 | SLA |
|---|---|---|---|
| `severity:P0` | **Blocker** — 사용자가 도구를 전혀 못 씀 | install 실패, 모든 룰 무발화, CLI 크래시, alpha.2-tree-sitter-32KB 같은 native binding 결함 | 24h ack · 48h fix or workaround |
| `severity:P1` | **High** — 핵심 기능 결함 | 비협상 룰 misfire, 잘못된 차단, 한국 도메인 룰 false positive 다수 | 72h ack · 1 cycle 내 fix |
| `severity:P2` | **Medium** — 사용자 회피 가능한 결함 | false positive 1 패턴 (예: Nest spec 파일 `route-needs-rate-limit`), docs 부정확, 마이너 UX | 1주 ack · 2 cycle 내 fix or accept |
| `severity:P3` | **Low** — nice-to-have | 룰 추가 요청, 마이너 i18n, 새 stack preset 요청 | 자유 (1.0 stable 이후 검토) |

## 2. 라벨 부여 규칙

- **자동** (향후 sub-task): GitHub Actions가 issue template의 `## Severity` 헤더 값에 따라 자동 라벨 부여. 본 cycle 범위 외 — beta.2 또는 1.0.0 stable cycle에서 도입 검토.
- **수동**: 메인테이너가 triage 시 24시간 내 라벨링.

## 3. 메인테이너 책임

| Severity | 즉시 액션 | 사이클 내 액션 |
|---|---|---|
| P0 | 24h 내 ack + workaround 게시 + 진척 댓글 매일 갱신 | 48h 내 fix 또는 workaround 안정화. publish 금지. |
| P1 | 72h 내 ack + 다음 cycle plan 우선순위 1로 진입 | 1 cycle 내 fix + 회귀 가드 unit test 추가 |
| P2 | 1주 내 ack + catalog | 2 cycle 내 ROADMAP의 다음 베타 "(검토)" 섹션에 후보로 등재 |
| P3 | 검토 후 close 또는 `backlog` 라벨 | 1.0.0 stable 이후 cycle plan에서 재검토 |

## 4. G3 게이트 (`severity:P1` 미해결 = 0)

- 매주 [`monitor-npm.yml`](../../.github/workflows/monitor-npm.yml) 워크플로 결과와 함께 `severity:P1` open issue count 확인.
- ROADMAP 게이트 측정: `closed / (closed + open) ≥ 0.7` AND `severity:P1` open = 0.
- 1.0.0 stable 진입 직전 = 0이어야 함.

## 5. 비협상 규칙

- **`severity:P0` open ≥ 1**이면 **npm publish 금지**. dist-tag 이동도 금지.
- **`severity:P1` open ≥ 1**이면 **1.0.0 stable 진입 금지** (베타 phase 연장).
- close 전 회귀 가드 unit test 추가 필수 (기존 4축 hotfix 정책 §B "CI 회귀 fixture" 준수, ~/.claude/rules/external-tool-adoption.md §4).

## 6. 외부 dogfood 결과 처리

외부 dogfood(`docs/case-studies/` 및 brain `aicqtools-external-dogfood-*` 메모)에서 발견된 false positive·결함은 다음 규칙으로 issue 변환:

| dogfood 결과 | issue 변환 |
|---|---|
| 비협상 룰 misfire | `severity:P1` |
| FP 1 패턴 (회피 가능) | `severity:P2` + label `area:dogfood` |
| 룰 추가 후보 | `severity:P3` + label `kind:rule-candidate` |

## 7. 라벨 일람

- `severity:P0` / `severity:P1` / `severity:P2` / `severity:P3`
- `monitoring:weekly` (자동 — npm DL 모니터링)
- `area:dogfood` / `area:guardrail` / `area:provenance` / `area:cli` / `area:docs`
- `kind:bug` / `kind:rule-candidate` / `kind:enhancement` / `kind:docs`
- `backlog` (P3 검토 후 보류)

---

본 정책은 베타 phase 동안 검증 후 1.0.0 stable에서 재정비합니다. 변경 시 ROADMAP G3 게이트 정의와 함께 갱신.
