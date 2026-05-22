# Security Policy / 보안 정책

## 🇰🇷 한국어

aicqtools 보안 취약점을 책임감 있게 보고해 주셔서 감사합니다.

### 지원 버전

| 버전 | 지원 상태 | 보안 패치 |
|------|---------|---------|
| `1.0.0-beta.x` | ✅ 활성 | 적용 |
| `1.0.0-alpha.x` | ⛔ EOL (2026-05-21 종료) | 적용 안 함 — `@beta` 또는 `latest`로 이전 권장 |
| `1.0.x` (예정) | ✅ 예정 (1.0.0 stable 진입 시) | 적용 |

활성 버전에 한해 보안 패치를 우선 배포합니다. EOL 버전은 호환성을 위해 npm에 그대로 남지만 신규 패치는 제공되지 않습니다.

### 적용 범위 (in-scope)

다음 npm 패키지 및 산출물에 대한 취약점 보고를 환영합니다:

- `@aicqtools/core`
- `@aicqtools/cli`
- `@aicqtools/rule-sdk`
- `@aicqtools/guardrail`
- `@aicqtools/provenance`
- GitHub Action `packages/action/` (활성 단계)
- 공식 docs site / GitHub repo 자체

### 적용 제외 (out-of-scope)

다음은 본 보안 정책의 책임 범위 밖입니다:

- aicqtools를 사용한 외부 프로젝트(예: TalkUp 등 dogfood repo)의 취약점 — 해당 프로젝트의 자체 보안 정책을 따르세요.
- 사용자 코드 내 취약점 — aicqtools는 **검출** 도구이며 사용자 코드의 보안 책임은 사용자에게 있습니다.
- 사용자가 직접 작성한 커스텀 룰(rule-sdk)의 동작 결함 — 커스텀 룰은 사용자 책임 범위.
- 의존성 패키지 자체의 취약점 — `npm audit` 결과를 본 repo `Dependabot`이 추적하지만, upstream 보안 보고는 해당 패키지 메인테이너에게 직접 하세요.

### 보고 채널

**우선 채널 (권장):**
- **GitHub Security Advisories** — [https://github.com/aicqtools/aicqtools/security/advisories/new](https://github.com/aicqtools/aicqtools/security/advisories/new)
  - 비공개 보고, 메인테이너에게만 노출됨
  - 패치 후 공개 disclosure 시 자동 CVE 발급 가능

**보조 채널:**
- **이메일** — `neuralflux3@gmail.com`
  - 제목 prefix: `[aicqtools SECURITY]`
  - 본문에 재현 절차, 영향 범위, 제안 패치(있다면) 포함

공개 GitHub Issue는 **사용하지 마세요** — 취약점이 공개되어 다른 사용자가 위협에 노출됩니다.

### 응답 SLA

| 단계 | 목표 시간 |
|------|---------|
| 접수 확인 (ack) | **48시간 이내** |
| 1차 영향 분류 (severity) | **14일 이내** |
| 패치 배포 (CVSS High 이상) | **30일 이내** |
| 공개 disclosure | 패치 배포 후 **최대 90일** |

베타 phase 동안은 메인테이너 1인 운영이라 위 SLA는 best-effort입니다. 더 느릴 경우 메일로 사정 안내드립니다.

### 책임 있는 공개 (responsible disclosure)

- 패치 배포 전 공개 노출 자제를 부탁드립니다.
- 보고자 credit은 disclosure 시점 release notes에 반영합니다(원치 않으시면 익명 처리).
- 보상 프로그램(bug bounty)은 베타 phase 중 운영하지 않습니다.

### 데이터 처리 안전성

aicqtools 자체는 사용자 코드/AST/위반 결과를 외부로 송신하지 않습니다. 자세한 내용은 [docs/policy/data-handling.md](docs/policy/data-handling.md)를 참조하세요.

---

## 🇬🇧 English

Thank you for responsibly reporting security vulnerabilities in aicqtools.

### Supported versions

| Version | Status | Security patches |
|---------|--------|------------------|
| `1.0.0-beta.x` | ✅ Active | Yes |
| `1.0.0-alpha.x` | ⛔ EOL (ended 2026-05-21) | No — migrate to `@beta` or `latest` |
| `1.0.x` (planned) | ✅ Planned (on 1.0.0 stable) | Yes |

Security patches are prioritized for active versions. EOL versions remain on npm for compatibility but receive no new patches.

### In-scope

We welcome vulnerability reports for the following npm packages and artifacts:

- `@aicqtools/core`
- `@aicqtools/cli`
- `@aicqtools/rule-sdk`
- `@aicqtools/guardrail`
- `@aicqtools/provenance`
- GitHub Action under `packages/action/` (once active)
- Official docs site / GitHub repo itself

### Out-of-scope

The following are outside this policy:

- Vulnerabilities in third-party projects that **use** aicqtools (e.g. TalkUp or other dogfood repos) — follow that project's own policy.
- Vulnerabilities in user code — aicqtools is a **detection** tool; securing the underlying code remains the user's responsibility.
- Bugs in custom rules written via `rule-sdk` — custom rule behavior is the rule author's responsibility.
- Vulnerabilities in upstream dependency packages — `npm audit` and Dependabot track these, but please report upstream issues to the respective maintainers directly.

### Reporting channels

**Preferred (recommended):**
- **GitHub Security Advisories** — [https://github.com/aicqtools/aicqtools/security/advisories/new](https://github.com/aicqtools/aicqtools/security/advisories/new)
  - Private to maintainers only
  - Eligible for automatic CVE assignment after disclosure

**Backup:**
- **Email** — `neuralflux3@gmail.com`
  - Subject prefix: `[aicqtools SECURITY]`
  - Include reproduction steps, impact, and a proposed patch (if any)

**Do not** use public GitHub Issues — that would expose the vulnerability to other users.

### Response SLA

| Stage | Target |
|-------|--------|
| Acknowledgement (ack) | within **48 hours** |
| Initial severity triage | within **14 days** |
| Patch release (CVSS High or above) | within **30 days** |
| Public disclosure | up to **90 days** after patch |

During the beta phase aicqtools is maintained by a single maintainer, so these targets are best-effort. We'll email you if a report requires longer.

### Responsible disclosure

- Please refrain from public disclosure before a patch ships.
- Reporter credit will be included in release notes at disclosure time (omit on request).
- No bug-bounty program during the beta phase.

### Data-handling safety

aicqtools does not transmit user code, ASTs, or violation results to any external service. See [docs/policy/data-handling.md](docs/policy/data-handling.md) for details.
