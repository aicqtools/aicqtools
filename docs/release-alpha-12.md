# aicqtools v1.0.0-alpha.12 release · dogfood · acceptance 실행 plan

> 이 문서는 **소장님(엄식) 직접 실행** 절차입니다. Claude는 publish/release 명령을 대행하지 않습니다 (npm token 노출 위험).
> 일반 publish 절차는 `docs/npm-publish.md`, 알파.12 특화 baseline·함정·acceptance는 본 문서.

## Context

알파.12 구현은 2026-05-18 완료 — 11/11 task green, guardrail 252 + cli 25 통과. 후속 단계는 **publish → dogfood → acceptance → release** 순서 진행. 본 plan은 PowerShell에서 그대로 복붙 가능한 명령어 시퀀스 + 각 단계 함정 노트 + 회귀 가드 baseline 인용.

전제:
- 작업 디렉토리는 `d:\AI\Projects\aicq` (git repo, 알파.12 변경 17 파일 unstaged + 2 신규 테스트 untracked, 알파.11이 마지막 commit).
- TalkUp 모노레포는 `d:\AI\Claude Data\TalkUp` (frontend / backend / frontend_admin 3 모듈).
- npm registry token이 `~/.npmrc`에 등록돼있는 상태(알파.7 시점 정착).
- pwsh 7+ / pnpm v10+ / Node 22+ 환경.

참조:
- brain `npm-publish-pitfalls` — 6 함정 + 6b latest 정책 + 알파별 재발 이력
- brain `release-notes-bilingual-pattern` / `feedback-aicqtools-bilingual-mandatory` — Release body 한·영 동시
- brain `~/Brain/10_projects/talkup/aicq_alpha11_acceptance.md` — 알파.11 baseline 인용
- brain `~/Brain/10_projects/talkup/aicq_alpha10_acceptance.md` — 보존 항목 인용

## 기대 baseline (모든 단계에서 회귀 가드)

| 항목 | 값 | 출처 |
|---|---|---|
| frontend totalDiag | 741 | 알파.10 acceptance |
| backend totalDiag | 2,857 | 알파.10 acceptance |
| frontend_admin totalDiag | 179 | 알파.10 acceptance |
| backend `camelcase-migration-column` | 2 (라인 14, 31) | 알파.7~11 |
| backend `no-direct-openai` | 0 | 알파.7~11 |
| `@aicq/parse-failed` 전 모듈 | 0/0/0 | 알파.5~11 |
| backend `controller-needs-async-wrapper` | 18 | 알파.10/11 |
| backend `no-console-log` | 392 | 알파.10 (scripts/ skip 후) |
| frontend `no-magic-number` | 368 | 알파.10 (native-bridge skip 후) |
| frontend `no-empty-catch` | 38 | 알파.10 (native-bridge skip 후) |

알파.12는 룰 로직 변경 0이라 **모든 카운트가 정확히 동일해야 함**. 다른 결과면 즉시 정지 후 원인 추적.

알파.12 신규 가시 변화(non-counts):
- `aicq rules suggest` text에 `↳ auto-skipped paths: ...` 줄 (no-console-log / no-empty-catch / no-magic-number 한정).
- `aicq rules suggest --format yaml`의 룰 코멘트에 `auto-skips: ...` append.
- `aicq --version` = `1.0.0-alpha.12`.

---

## Stage A — git commit + tag

```powershell
cd D:\AI\Projects\aicq

# A1. 사전 확인 — 알파.12 변경 surface 17 파일 + 2 신규 테스트만 떠야 함
git status --short

# A2. 스테이징 (개별 add — `git add .`은 .env/캐시 위험)
git add `
  CHANGELOG.md `
  packages/core/package.json `
  packages/core/src/i18n/messages.ts `
  packages/rule-sdk/package.json `
  packages/rule-sdk/src/types.ts `
  packages/cli/package.json `
  packages/cli/src/__tests__/version.test.ts `
  packages/action/package.json `
  modules/guardrail/package.json `
  modules/guardrail/src/rules-default/no-console-log.ts `
  modules/guardrail/src/rules-default/no-empty-catch.ts `
  modules/guardrail/src/rules-default/no-magic-number.ts `
  modules/guardrail/src/suggest/types.ts `
  modules/guardrail/src/suggest/analyze.ts `
  modules/guardrail/src/suggest/format.ts `
  modules/guardrail/src/__tests__/suggest.test.ts `
  modules/guardrail/src/__tests__/rules-default-skip-patterns-meta.test.ts `
  modules/guardrail/src/__tests__/suggest-yaml-roundtrip.test.ts `
  modules/provenance/package.json

# A2b. 본 plan 문서 자체도 동시 add (release 절차의 일부)
git add docs/release-alpha-12.md

# A3. 사전 diff 한 번 더 (모르고 두고 간 변경 없는지)
git diff --cached --stat

# A4. commit (알파.7~11 commit body 스타일과 일치)
git commit -m "release: v1.0.0-alpha.12 — RuleMeta.skipPatterns + suggest paste-ready round-trip guard"

# A5. 태그
git tag v1.0.0-alpha.12

# A6. 확인
git log --oneline -3
git tag --list "v1.0.0-alpha.*"
```

**기대**: HEAD가 새 commit + tag `v1.0.0-alpha.12` 추가. push는 Stage F에서.

---

## Stage B — npm publish

### B1. dry-run (실제 변경 0)

```powershell
cd D:\AI\Projects\aicq

# private인 @aicqtools/action은 자동 제외. 5 패키지만 dry-run.
pnpm -r publish --dry-run --tag alpha --no-git-checks
```

**기대**: 5 패키지 모두 "Tarball Contents" 출력 + `--dry-run`이라 실제 게시 안 됨. error 0.

**함정 확인**:
- `tarball` 크기 비정상(e.g. dist 누락)? → `pnpm -w build` 다시 실행.
- `@aicqtools/action` dry-run 출력에 등장하면 `"private": true` 누락 → 즉시 정지.

### B2. 실제 publish

```powershell
pnpm -r publish --tag alpha --no-git-checks
```

**기대**: 5 패키지 1회 성공. 부분 실패 시 brain `npm-publish-pitfalls` §5 절차(`npm view <pkg> versions`로 상태 확인 후 누락분만 개별 publish).

**함정 1**: 2FA Security Key prompt 뜨면 Windows Hello 또는 Granular Access Token. brain `npm-publish-pitfalls` §1/§2.

### B3. dist-tag latest 이동 (brain `npm-publish-pitfalls` §6b — 2026-05-12 결정 정책)

```powershell
foreach ($pkg in @('core','cli','rule-sdk','guardrail','provenance')) {
  npm dist-tag add "@aicqtools/$pkg@1.0.0-alpha.12" latest
}

# 확인
foreach ($pkg in @('core','cli','rule-sdk','guardrail','provenance')) {
  npm view "@aicqtools/$pkg" dist-tags
}
```

**기대**: 모든 패키지 `{ latest: '1.0.0-alpha.12', alpha: '1.0.0-alpha.12' }`.

**함정 3 (dist-tag 캐시 지연)**: `npm view` 결과가 1~5분 stale. 명시 안 보이면 1분 후 재실행 또는 install 테스트(B4)로 확정.

**함정 — 권한 차단**: 알파.7 publish 때 `npm dist-tag add`가 권한 분류기에 차단된 이력 (brain `npm-publish-pitfalls` §6b 사례). 본 환경 PowerShell에서 사용자가 직접 실행하면 통과.

---

## Stage C — 격리 install 검증

```powershell
# C1. 격리 디렉토리
$probe = "$env:TEMP\aicq-alpha12-run"
if (Test-Path $probe) { Remove-Item -Recurse -Force $probe }
New-Item -ItemType Directory $probe | Out-Null
cd $probe

# C2. 빈 프로젝트 + alpha cli 설치
pnpm init
pnpm add -D "@aicqtools/cli@alpha"

# C3. native build 승인 (brain `npm-publish-pitfalls` §4)
pnpm approve-builds
# → 인터랙티브: better-sqlite3 / tree-sitter / tree-sitter-typescript / tree-sitter-python / tree-sitter-javascript 5개 ✓ 후 Enter

# C4. 버전 확인
npx aicq --version
# 기대: 1.0.0-alpha.12

# C5. rules suggest 출력에서 알파.12 신규 가시 변화 확인
mkdir scripts -Force | Out-Null
echo "console.log('hi');" | Out-File -Encoding utf8 .\scripts\check.ts
echo "const x = 5; console.log(x);" | Out-File -Encoding utf8 .\app.ts
npx aicq rules suggest --format text | Select-String "auto-skipped|↳"
# 기대: ↳ auto-skipped paths: ... 줄이 보여야 함 (no-console-log 등에서)

npx aicq rules suggest --format yaml | Select-String "auto-skips"
# 기대: # ...auto-skips: ... 코멘트 줄 존재

# C6. yaml round-trip 수동 확인
npx aicq rules suggest --format yaml > aicq.config.yaml
npx aicq check
# 기대: 정상 종료. parse error 0.
```

**기대 결과**:
- `aicq --version` = `1.0.0-alpha.12`.
- text 출력에 `↳ auto-skipped paths:` (en locale).
- yaml 출력에 `auto-skips: ...` 코멘트.
- `aicq rules suggest --format yaml > aicq.config.yaml && aicq check`가 깨지지 않음 (paste-ready 계약 수동 확인).

**함정 4 재발 가능 — approve-builds**: pnpm v10+ 보안 정책 그대로. 미승인 시 native 에러로 aicq 실행 자체 불가.

---

## Stage D — TalkUp 3 모듈 dogfood

### D1. 격리 install 환경 그대로 사용

```powershell
# C1~C4의 $probe = "$env:TEMP\aicq-alpha12-run"에서 그대로 진행
$probe = "$env:TEMP\aicq-alpha12-run"
$talkup = "D:\AI\Claude Data\TalkUp"
$out = "$talkup\alpha12-reports"
if (Test-Path $out) { Remove-Item -Recurse -Force $out }
New-Item -ItemType Directory $out | Out-Null
```

### D2. 모듈별 점검 — frontend

```powershell
cd "$talkup\frontend"
& "$probe\node_modules\.bin\aicq" check --format json --output "$out\frontend.json" 2>&1 | Tee-Object -FilePath "$out\frontend.stderr.txt"

# totalDiag 추출
(Get-Content "$out\frontend.json" | ConvertFrom-Json).diagnostics.Count
# 기대: 741
```

### D3. 모듈별 점검 — backend

```powershell
cd "$talkup\backend"
& "$probe\node_modules\.bin\aicq" check --format json --output "$out\backend.json" 2>&1 | Tee-Object -FilePath "$out\backend.stderr.txt"

(Get-Content "$out\backend.json" | ConvertFrom-Json).diagnostics.Count
# 기대: 2857
```

### D4. 모듈별 점검 — frontend_admin

```powershell
cd "$talkup\frontend_admin"
& "$probe\node_modules\.bin\aicq" check --format json --output "$out\admin.json" 2>&1 | Tee-Object -FilePath "$out\admin.stderr.txt"

(Get-Content "$out\admin.json" | ConvertFrom-Json).diagnostics.Count
# 기대: 179
```

### D5. 보존 항목 정량 확인

```powershell
# JSON 파일에서 룰별 카운트 추출 (PowerShell 7+ 또는 jq 대체)
function Count-Rule($file, $id) {
  ((Get-Content $file | ConvertFrom-Json).diagnostics | Where-Object { $_.ruleId -eq $id }).Count
}

# backend 보존 셋
Count-Rule "$out\backend.json" "camelcase-migration-column"  # 기대: 2
Count-Rule "$out\backend.json" "no-direct-openai"            # 기대: 0
Count-Rule "$out\backend.json" "controller-needs-async-wrapper"  # 기대: 18
Count-Rule "$out\backend.json" "no-console-log"              # 기대: 392
Count-Rule "$out\backend.json" "@aicq/parse-failed"          # 기대: 0

# frontend 보존 셋
Count-Rule "$out\frontend.json" "no-magic-number"            # 기대: 368
Count-Rule "$out\frontend.json" "no-empty-catch"             # 기대: 38
Count-Rule "$out\frontend.json" "@aicq/parse-failed"         # 기대: 0

# admin parse-failed
Count-Rule "$out\admin.json" "@aicq/parse-failed"            # 기대: 0
```

### D6. 알파.12 신규 표시 확인 — rules suggest

```powershell
cd "$talkup\frontend"
& "$probe\node_modules\.bin\aicq" rules suggest --format text --locale en | Select-String "auto-skipped"
# 기대: ↳ auto-skipped paths: ... 줄이 no-console-log 다음에 보여야 함

& "$probe\node_modules\.bin\aicq" rules suggest --format text --locale ko | Select-String "자동 스킵"
# 기대: ↳ 자동 스킵 경로: ... 줄
```

**판정 기준 — 모두 일치하면 PASS**:
- 3 모듈 totalDiag = 741 / 2,857 / 179.
- 보존 셋 8개 카운트 모두 동일.
- `↳ auto-skipped paths:` (en) / `↳ 자동 스킵 경로:` (ko) 텍스트 등장.

불일치 시: 즉시 정지, 차이 정리, brain에 hot 이슈 기록 후 alpha.13 hotfix 판단.

---

## Stage E — acceptance verification + brain 기록

### E1. 합성 fixture hands-on (알파.12 신규 동작)

```powershell
$fix = "$env:TEMP\aicq-alpha12-handson"
if (Test-Path $fix) { Remove-Item -Recurse -Force $fix }
New-Item -ItemType Directory $fix | Out-Null

# H1. skipPatterns 메타가 suggest 출력에 노출 (no-console-log)
$h1 = "$fix\h1"; mkdir $h1 | Out-Null; cd $h1
"const x = 5; console.log(x);" | Out-File -Encoding utf8 app.ts
& "$probe\node_modules\.bin\aicq" rules suggest --format yaml --locale en > out.yaml
Get-Content out.yaml | Select-String "auto-skips"
# 기대: # ...auto-skips: ... 코멘트 줄 존재

# H2. yaml round-trip — suggest 출력을 그대로 config로 사용
Copy-Item out.yaml aicq.config.yaml
& "$probe\node_modules\.bin\aicq" check
# 기대: parse error 0, 정상 종료

# H3. SKIP_FILE_RE 실코드가 여전히 동작 (런타임 가드 보존)
cd $fix; mkdir h3\scripts -Force | Out-Null
"console.log('build');" | Out-File -Encoding utf8 h3\scripts\build.ts
"console.log('app');" | Out-File -Encoding utf8 h3\app.ts
cd h3
& "$probe\node_modules\.bin\aicq" check --format json --output out.json
$diags = (Get-Content out.json | ConvertFrom-Json).diagnostics
$diags | Where-Object { $_.ruleId -eq 'no-console-log' } | ForEach-Object { $_.file }
# 기대: app.ts만 등장, scripts/build.ts는 없음 (SKIP_FILE_RE 작동)
```

### E2. brain 기록 — acceptance 메모

```powershell
$brainPath = "10_projects/talkup/aicq_alpha12_acceptance.md"
$brainBody = @'
# TalkUp x aicqtools v1.0.0-alpha.12 Acceptance (2026-05-??)

## 한 줄
알파.12 = 2개 항목 묶음 (skipPatterns 메타 노출 + suggest yaml paste-ready round-trip 회귀 가드). 3 모듈 totalDiag delta=0 (룰 로직 변경 0), 보존 셋 8 카운트 동일, hands-on 3 시나리오 PASS.

## Pre-flight
- aicq --version = 1.0.0-alpha.12.
- 격리 install /tmp/aicq-alpha12-run에서 npx aicq 호출.
- TalkUp 3 모듈 alpha-12-reports/ 산출.

## 3 모듈 delta vs 알파.11 baseline (변경 0 기대)
- frontend: 741 → ?
- backend: 2,857 → ?
- admin: 179 → ?

## 보존 셋
- backend camelcase-migration-column = 2 (?)
- backend no-direct-openai = 0 (?)
- backend controller-needs-async-wrapper = 18 (?)
- backend no-console-log = 392 (?)
- frontend no-magic-number = 368 (?)
- frontend no-empty-catch = 38 (?)
- parse-failed 0/0/0 (?)

## Hands-on (합성 fixture 3 시나리오)
- H1 suggest yaml에 auto-skips 코멘트 출력 — ?
- H2 suggest yaml을 그대로 config로 사용 → aicq check 통과 — ?
- H3 런타임 SKIP_FILE_RE 가드 보존(scripts/ 안 fire) — ?

## 알파.13 후보 (잔존)
1. SKIP_FILE_RE escape hatch (skipBuiltinSkips: true) — 알파.11/12 미반영.
2. exclude: user-facing docs (README) — 알파.11 negation 경고가 추천했지만 docs는 비어 있음.
3. SKIP_FILE_RE 메타 vs 실코드 단일 진실 원천화 — 알파.12 절충안. v1.0 룰 옵션 framework로 미룸.
'@

# 실제 값 채워 넣어 작성 후 brain-cli write
# (PowerShell에서 직접 작성: 위 카운트 자리 ?를 실측 값으로 치환)
$brainBody | Out-File -Encoding utf8 "$env:TEMP\alpha12-acceptance.md"
notepad "$env:TEMP\alpha12-acceptance.md"  # 또는 다른 에디터로 ? 채우기
```

### E3. brain-cli write — record 등록

```powershell
# 최종 내용 확정 후 — content + record 한 JSON으로 묶기
$content = Get-Content "$env:TEMP\alpha12-acceptance.md" -Raw

$intent = @{
  action = "create"
  sourceRef = "10_projects/talkup/aicq_alpha12_acceptance.md"
  content = $content
  record = @{
    scopeType = "project"
    scopeId = "talkup"
    type = "note"
    title = "TalkUp x aicqtools v1.0.0-alpha.12 Acceptance"
    summary = "alpha.12 = skipPatterns 메타 + suggest yaml round-trip 가드 / 3 모듈 delta=0 / hands-on 3 PASS"
    tags = @("domain/devops", "intent/reference")
    sourceType = "candidate"
  }
} | ConvertTo-Json -Depth 6 -Compress

# JSON을 임시 파일 경유 (인용 escape 안전)
$intent | Out-File -Encoding utf8 "$env:TEMP\alpha12-intent.json"
brain-cli write "$(Get-Content $env:TEMP\alpha12-intent.json -Raw)"
```

**기대**: brain에 `rec_proj_talkup_2026MMDD_0001` (또는 동일 날짜 다음 번호)로 등록. 알파.13 후보 잔존 목록 포함.

---

## Stage F — git push + GitHub Release

```powershell
cd D:\AI\Projects\aicq

# F1. push (commit + tag 동시)
git push origin main
git push origin v1.0.0-alpha.12

# F2. CHANGELOG의 알파.12 섹션을 release body로 추출 (한·영 둘 다)
$changelog = Get-Content CHANGELOG.md -Raw
$start = $changelog.IndexOf("## [v1.0.0-alpha.12]")
$end   = $changelog.IndexOf("## [v1.0.0-alpha.11]")
$body  = $changelog.Substring($start, $end - $start).Trim()
$body | Out-File -Encoding utf8 "$env:TEMP\alpha12-release-body.md"

# F3. GitHub Release 생성 (Pre-release 체크, bilingual body)
gh release create v1.0.0-alpha.12 `
  --title "v1.0.0-alpha.12" `
  --notes-file "$env:TEMP\alpha12-release-body.md" `
  --prerelease

# F4. 확인
gh release view v1.0.0-alpha.12
```

**기대**: GitHub Releases 페이지에 알파.12 prerelease 등록. body 한국어 → `---` → 영어 패턴.

**함정**: `gh release create`가 body에 코드블록 안의 backtick을 다르게 escape할 수 있음. 결과 페이지 확인 필수. 깨졌으면 `gh release edit --notes-file ...` 재시도.

---

## 함정 빠른 참조 (brain `npm-publish-pitfalls` 발췌)

| # | 함정 | 즉시 조치 |
|---|---|---|
| 1 | TOTP 신규 등록 차단 | Windows Hello Passkey 등록 → Granular Token |
| 2 | Authenticator로 Passkey QR 못 읽음 | "변경" → Windows Hello 선택 |
| 3 | dist-tag view CDN 캐시 1~5분 지연 | install 테스트로 확정 |
| 4 | pnpm v10+ approve-builds 미승인 → native 에러 | `pnpm approve-builds` 후 5개 ✓ |
| 5 | 부분 publish 후 같은 버전 재publish E403 | `npm view <pkg> versions`로 누락만 개별 |
| 6/6b | latest 자동 부여 vs alpha 라인 정책 | `npm dist-tag add ... latest` 명시 이동 |

---

## 정지 조건 (즉시 사용자 통보)

- B2 publish가 5개 중 일부만 성공: §5 절차 적용 전에 정지.
- C4 `aicq --version` ≠ `1.0.0-alpha.12`: cache 의심, `npm view @aicqtools/cli versions`로 확인.
- D2/D3/D4 totalDiag가 baseline ±0이 아니면: 즉시 정지, 차이를 정리해 보고.
- D5 보존 셋 중 1건이라도 어긋나면: 즉시 정지.
- E1 H2 (yaml round-trip) parse error 발생: paste-ready 계약 깨짐 — alpha.13 hotfix 필요.

각 stage 결과를 한 단계씩 보고 → 다음 stage 진행 여부 결정. 한 번에 묶지 말고 step-by-step.
