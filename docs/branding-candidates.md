# 임시 GitHub organization & 도메인 후보 (Phase 0 사전 작업 C1)

> Phase 5 (통합 브랜드 결정 시점)에 일괄 교체될 **임시** 명칭. 지금은 짧고 변경 부담이 적은 후보를 우선.

조사일: 2026-05-07. npm scope 가용성은 registry API로 검증 완료.

## 후보 5개 비교

| # | 이름 | npm scope | 의미 | 길이 | 발음 | 추천도 |
|---|------|-----------|------|------|------|--------|
| 1 | **aicq** | `@aicq` ✅ | AI Code Quality 약어 | 4자 | "에이아이씨큐" / "에이크" | ★★★★★ |
| 2 | **aicqtools** | `@aicqtools` ✅ | AI Code Quality + tools | 9자 | 길고 어색 | ★★ |
| 3 | **aicodequality** | `@aicodequality` ✅ | full name | 13자 | 길지만 명확 | ★★★ |
| 4 | **codepact** | `@codepact` ✅ | "코드 약속", 결정론적 룰의 메타포 | 8자 | "코드팩트" 명료 | ★★★★ |
| 5 | **vibeguard** | `@vibeguard` ✅ | 바이브코딩 + 가드 | 9자 | "바이브가드" 직관적 | ★★★ |

## 추천

**1순위: `aicq`** (4자, npm scope @aicq 비어 있음, 현재 모노레포 임시명과 일치)
- 모노레포 / 임시 organization / 패키지 prefix 모두 `aicq` 통일
- Phase 5에서 통합 브랜드로 rename 시 organization 1번, npm scope 1번만 옮기면 됨
- 한국에서도 발음 짧음 ("에이크" 또는 "에이아이씨큐")

**2순위: `codepact`** (의미 깊음, 다만 출처 추적기·의존성 검증기까지 포괄하는 의미는 살짝 좁음)

## 도메인 후보 (사용자 직접 확인 필요)

도메인 가용성은 WHOIS / TLD 등록처에서 확인 필요. Cloudflare Registrar 또는 Namecheap 권장.

| 1순위 (aicq) | 2순위 (codepact) |
|--------------|------------------|
| aicq.dev | codepact.dev |
| aicq.io | codepact.io |
| aicq.tools | codepact.tools |
| aicq.kr | codepact.kr |
| aicq.app | — |

`.dev` 추천 — 구글 운영, HSTS 강제(자동 HTTPS), 개발자 대상 SaaS 표준.

## GitHub organization

GitHub organization 이름은 npm scope와 동일하게 가져가는 것이 자연. `aicq` 선택 시:

```
https://github.com/aicq
https://github.com/aicq/aicq          (이 모노레포 push 위치)
```

가용성 확인은 GitHub에서 organization 생성 시도 시 즉시 알려줍니다 (또는 https://github.com/aicq 접속 → 404면 사용 가능).

## 진행 절차 (사용자 작업)

1. **GitHub organization 생성**
   - https://github.com/organizations/new
   - 이름: `aicq` (1순위 추천)
   - 소속: 무료 플랜으로 시작 (Phase 1a까지)
   - Private/Public 결정 — Phase 0~1a는 Private 권장

2. **도메인 매입** (선택, v1.0 출시 전까지 가능)
   - Cloudflare Registrar (가장 저렴)
   - 1순위: `aicq.dev` + `aicq.io` 듀얼 보유
   - 약 $10~15/년 × 2 = $20~30/년

3. **로컬 git 저장소를 GitHub remote에 연결**
   ```bash
   cd d:/AI/Projects/aicq
   git remote add origin git@github.com:aicq/aicq.git
   git push -u origin master
   ```
   또는 gh CLI:
   ```bash
   gh repo create aicq/aicq --private --source=. --remote=origin --push
   ```

4. **결정 결과를 plan 파일에 기록**
   - organization 이름 / 도메인 / GitHub URL을 plan의 "확정된 결정 사항" 섹션에 추가

## 플랜 영향

`aicq` 채택 시:
- `package.json`의 모노레포 루트 name `"name": "aicq"` — **변경 불필요** (이미 일치)
- 워크스페이스 패키지 scope `@aicqtools/core`, `@aicqtools/cli` 등 — **변경 불필요** (이미 일치)
- README의 임시명 표시 정리 가능

다른 이름 채택 시:
- 모든 package.json의 name + workspace dependency 명시 일괄 교체 필요
- 약 5개 패키지 × 1~2 dep = 10건 정도의 검색·치환
