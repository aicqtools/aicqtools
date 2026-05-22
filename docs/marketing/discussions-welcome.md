# GitHub Discussions — 활성화 가이드 + 환영 핀 글

> 본 문서는 **사용자(메인테이너)가 GitHub에서 직접 수행할 작업의 체크리스트와 핀 글 본문 복사용 원고**입니다. CI/스크립트로 자동화하지 않습니다.

## 🇰🇷 한국어

### 1) Discussions 활성화 절차 (한 번)

1. `https://github.com/aicqtools/aicqtools` 접속
2. **Settings** → **General** → 하단의 **Features** 섹션
3. **Discussions** 체크박스 활성화 → **Set up discussions** 클릭
4. 자동 생성된 기본 카테고리(General, Q&A, Ideas, Show and tell)를 다음 4종으로 정비

### 2) 카테고리 4종 구성 (Discussions → Categories 편집)

| 카테고리 | 포맷 | 설명 (영문 + 한국어 보조) | 이모지 |
|---------|------|--------------------------|------|
| **Announcements** | Announcement | Release announcements and project updates from maintainers. / 메인테이너가 발행하는 릴리스·프로젝트 공지. | 📢 |
| **Q&A** | Question/Answer | Ask anything about installing, configuring, or using aicqtools. / 설치·설정·사용에 대한 모든 질문. | ❓ |
| **Show & Tell** | Open-ended | Share how you use aicqtools — custom rules, CI setups, dogfood findings. / 커스텀 룰, CI 통합, dogfood 결과 공유. | 🎉 |
| **RFC** | Open-ended | Propose new rules, feature changes, or roadmap items for discussion before issue/PR. / 새 룰·기능·로드맵 항목을 이슈/PR 전에 사전 논의. | 📝 |

- 기본 General 카테고리는 **삭제 또는 비활성화**(Show & Tell로 통합).
- Ideas는 RFC로 rename + 설명 갱신.
- Q&A는 "Answers can be marked as accepted" 옵션 켜기.

### 3) 환영 핀 글 (Announcements 카테고리에 게시 → 핀 처리)

**제목 (영문 권장 — 글로벌 검색 노출):**
```
Welcome to aicqtools Discussions — Beta is here (v1.0.0-beta.1)
```

**본문 (한·영 bilingual, 한국어 먼저, 그대로 복사):**

```markdown
> 한국어 먼저 → `---` → English. 베타 phase에서 외부 사용자 피드백을 받기 위해 GitHub Discussions를 엽니다.

## 🇰🇷 한국어 — 베타 환영

aicqtools v1.0.0-beta.1이 npm에 공개됐습니다 (2026-05-21). alpha.7~19 (19 cycle) 누적 자산을 정식화하면서 **framework freeze + BREAKING 0 강제**로 진입한 단계입니다.

### 베타 phase 안내

- 베타 phase 동안 aicqtools는 **MIT OSS로 자유롭게 사용 가능**합니다 (5 패키지 모두 npm에 게시됨).
- 1.0 stable 출시 이후의 라이선스 / 유료 옵션 여부와 베타 사용자 우대 정책은 **1.0 시점에 별도 공지**합니다.
- **자동 유료 전환은 어떤 경우에도 없습니다** — 향후 유료 옵션이 도입되더라도 사용자의 명시적 동의 없이는 전환되지 않습니다 (다크 패턴 방지). 자세한 SLA: [docs/beta-sla.md](../beta-sla.md) 예정.

### 어디에 무엇을 쓰면 좋은가

- **❓ Q&A** — 설치/설정/룰 동작에 대한 질문. 한국어/영어 모두 환영. 답변이 채택되면 `Accepted` 라벨로 search hit가 됩니다.
- **🎉 Show & Tell** — 본인 프로젝트에 aicq를 도입한 결과(잡힌 위반 N건, 적용한 config 등), 커스텀 룰 공유, CI 통합 사례. dogfood 결과 모음용.
- **📝 RFC** — 새 룰 제안, 기능 변경 아이디어. 이슈/PR로 가기 전 디자인 논의용. RFC가 합의되면 issue로 승격.
- **📢 Announcements** — 릴리스/공지 (메인테이너 전용).

### 무엇이 이슈로 가야 하는가

- 명확한 버그 재현 가능 → [Bug report 템플릿](.github/ISSUE_TEMPLATE/bug_report.yml)
- 새 룰 제안 → [Rule request 템플릿](.github/ISSUE_TEMPLATE/rule_request.yml) (RFC 논의를 거친 경우 더 빠르게 머지)
- 보안 취약점 → **공개 issue/discussion에 올리지 마세요.** [SECURITY.md](../../SECURITY.md)의 GitHub Security Advisories 또는 메인테이너 이메일.

### 행동 강령 / 데이터 정책

- 모든 Discussions는 [Contributor Covenant 2.1](../../CODE_OF_CONDUCT.md)을 따릅니다.
- aicqtools는 **100% 로컬 실행 도구입니다** — 사용자 코드를 외부로 송신하지 않습니다. 상세: [data-handling 정책](../policy/data-handling.md).

### 1.0.0 stable 진입까지

베타 dogfood 안정 + 외부 검증 사용자 1~2팀 → 1.0 stable cycle. ROADMAP의 정량 게이트(외부 dogfood ≥ 2, npm DL ≥ 200/주, P1 미해결 = 0, soak 2 cycle): [ROADMAP.md](../../ROADMAP.md).

피드백 미리 감사드려요. — 메인테이너 (엄식, neuralflux3@gmail.com)

---

## 🇬🇧 English — Welcome to the beta

aicqtools v1.0.0-beta.1 shipped to npm on 2026-05-21. This release formalizes 19 cycles of accumulated assets (alpha.7~19) under **framework freeze + zero BREAKING**.

### Beta phase notes

- During the beta phase aicqtools remains **MIT OSS** — all 5 packages are freely available on npm.
- Any paid options or beta-user perks after 1.0 stable will be **announced separately at 1.0 time**.
- **No automatic conversion to paid** — if a paid option lands later, switching always requires explicit user consent (no dark patterns). Full SLA: [docs/beta-sla.md](../beta-sla.md), forthcoming.

### What goes where

- **❓ Q&A** — Install / configure / rule-behavior questions. Korean and English both welcome. Accepted answers show up in search.
- **🎉 Show & Tell** — Share what aicq caught in your project, your custom rules, your CI setup. The dogfood gallery.
- **📝 RFC** — Propose new rules or feature changes for discussion *before* opening an issue/PR. Accepted RFCs graduate to issues.
- **📢 Announcements** — Releases and project news (maintainer-only).

### What belongs in issues

- Clear, reproducible bug → [Bug report template](.github/ISSUE_TEMPLATE/bug_report.yml)
- New rule proposal → [Rule request template](.github/ISSUE_TEMPLATE/rule_request.yml) (RFC-vetted proposals merge faster)
- **Security vulnerabilities** — do **not** post these publicly. Use the GitHub Security Advisory channel or the maintainer's email per [SECURITY.md](../../SECURITY.md).

### Code of Conduct / data policy

- Discussions follow the [Contributor Covenant 2.1](../../CODE_OF_CONDUCT.md).
- aicqtools is a **100%-local tool** — user code is never transmitted externally. Details: [data-handling policy](../policy/data-handling.md).

### Road to 1.0.0 stable

Beta dogfood must stabilize and 1–2 external teams need to verify the tool. ROADMAP gates (external dogfood ≥ 2, npm DL ≥ 200/week, open P1 = 0, soak ≥ 2 cycles): [ROADMAP.md](../../ROADMAP.md).

Thanks in advance for the feedback. — Maintainer (Eom Sik, neuralflux3@gmail.com)
```

### 4) 핀 처리

- 위 글을 Announcements 카테고리에 게시
- 우측 사이드바 **⋯** → **Pin discussion** → 카테고리 전반에 고정
- 추가로 README 상단의 "더 알아보기" 섹션에 Discussions 링크 추가는 별개 작업 (PR로 진행)

### 5) 운영 팁

- **첫 7일**: 댓글/답글이 들어올 가능성이 높은 시점. **Watch 알림 ON** + 24시간 내 1차 답변 목표.
- **Q&A 답변 채택**: 좋은 답변은 메인테이너가 **Mark as answer** 클릭 — 같은 질문이 다시 들어왔을 때 검색 결과 상단에 노출.
- **노이즈/오프토픽**: 행동 강령 위반이 아니면 **lock conversation**보다 **convert to issue/RFC**가 우선 — discussion이 닫히면 정보가 묻힙니다.
- **i18n**: 한국어로 들어온 질문에는 한·영 양쪽 답변. 영어 사용자가 검색했을 때도 답이 잡히게.

---

## 🇬🇧 English

### 1) One-time activation

1. Open `https://github.com/aicqtools/aicqtools`
2. **Settings** → **General** → scroll to **Features**
3. Check **Discussions** → click **Set up discussions**
4. Reshape the default categories (General, Q&A, Ideas, Show and tell) into the four below.

### 2) Configure 4 categories

| Category | Format | Description | Emoji |
|----------|--------|-------------|-------|
| **Announcements** | Announcement | Maintainer-only release notes and project updates. | 📢 |
| **Q&A** | Question/Answer | Anything about installing, configuring, or using aicqtools. | ❓ |
| **Show & Tell** | Open-ended | How you use aicqtools — custom rules, CI setups, dogfood findings. | 🎉 |
| **RFC** | Open-ended | New-rule, feature, or roadmap proposals before issue/PR. | 📝 |

- Delete or merge the default **General** category into Show & Tell.
- Rename **Ideas** to **RFC** and update its description.
- Enable "Answers can be marked as accepted" for Q&A.

### 3) Pinned welcome post

Use the bilingual body above (Korean first, then `---`, then English). Post it in Announcements, then **⋯** → **Pin discussion**.

### 4) Operations notes

- **First 7 days**: enable Watch notifications. Target a first reply within 24 hours.
- **Q&A acceptance**: hit **Mark as answer** on good replies so future searches surface them.
- **Off-topic / noisy threads**: prefer **convert to issue/RFC** over **lock** — closing a discussion buries information.
- **Bilingual**: reply in both Korean and English so English search picks up Korean threads too.
