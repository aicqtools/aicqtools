# npm publish 가이드 — `@aicqtools/*` 워크스페이스

> 이 문서는 **소장님(엄식) 직접 실행** 절차입니다. Claude는 publish 명령을 대행하지 않습니다 (npm token 노출 위험).
> 실패 시 unpublish 정책 + 복구 절차도 마지막 §5에 있습니다.

## 1. 사전 준비

### 1-A. npm 계정 / organization

1. https://www.npmjs.com/login — 계정 로그인 (없으면 가입)
2. https://www.npmjs.com/org/create — `aicqtools` organization 생성
   - **중요**: organization 이름은 npm scope `@aicqtools`와 일치해야 함
   - Free 플랜으로 OK (public 패키지만 publish, 무제한)
3. 2FA 활성화 — https://www.npmjs.com/settings/<username>/profile
   - **Authenticator app 권장** (TOTP). publish 시 OTP 입력
   - WebAuthn은 publish 자동화에 비호환

### 1-B. npm token 발급

`Automation` 토큰을 권장 (publish 시 OTP 우회 가능 — CI 친화적이지만 보안 주의):

1. https://www.npmjs.com/settings/<username>/tokens
2. **Generate New Token → Granular Access Token**
   - Name: `aicqtools-publish-2026`
   - Expiration: **30~90일 추천** (만료 후 rotate)
   - Packages and scopes:
     - `@aicqtools/*` 만 선택 (least privilege)
   - Permissions: `Read and write`
3. 토큰 복사 (한 번만 표시됨, 분실 시 재발급)

`~/.npmrc`에 저장:
```bash
//registry.npmjs.org/:_authToken=npm_xxxxxxxxxxxxxxxxxxxxxxxx
```

또는 환경변수로 일회성:
```powershell
$env:NPM_TOKEN = "npm_xxx..."
# .npmrc에 //registry.npmjs.org/:_authToken=${NPM_TOKEN} 줄 추가
```

> ⚠️ `.npmrc`는 절대 commit하지 말 것 (`.gitignore`에 이미 포함). 토큰 노출 시 즉시 https://www.npmjs.com/settings/<username>/tokens 에서 revoke.

### 1-C. 로컬 dry-run 마지막 확인

```powershell
cd D:\AI\Projects\aicq
pnpm build
pnpm test
pnpm -r publish --dry-run --tag alpha --no-git-checks
```

5개 패키지 모두 `+ @aicqtools/<name>@1.0.0-alpha.2`로 끝나야 합니다. 실패하면 publish 중단하고 원인 해결.

## 2. publish 실행

### 의존성 순서 (권장)

```
core, rule-sdk          (의존성 없음)
  ↓
guardrail, provenance   (core, rule-sdk에 의존)
  ↓
cli                     (모두에 의존)
```

`pnpm -r publish`가 자동으로 의존성 그래프를 따라가지만, 첫 publish는 **수동으로 한 번씩** 실행하면서 검증하는 게 안전:

```powershell
# 1. core
cd D:\AI\Projects\aicq\packages\core
pnpm publish --tag alpha --no-git-checks
# OTP 입력 (Authenticator app)

# 2. rule-sdk
cd ..\rule-sdk
pnpm publish --tag alpha --no-git-checks

# 3. guardrail
cd ..\..\modules\guardrail
pnpm publish --tag alpha --no-git-checks

# 4. provenance
cd ..\provenance
pnpm publish --tag alpha --no-git-checks

# 5. cli
cd ..\..\packages\cli
pnpm publish --tag alpha --no-git-checks
```

`--tag alpha`는 prerelease를 npm dist-tag `alpha`로 태깅. 사용자가 `pnpm add @aicqtools/cli`로 install하면 `latest` (= prerelease 아님)을 받기 때문에 안전. `pnpm add @aicqtools/cli@alpha`로 명시해야 alpha.2 받음.

### 또는 한 번에

```powershell
cd D:\AI\Projects\aicq
pnpm -r publish --tag alpha --no-git-checks
```

OTP 5번 입력 (각 패키지마다). Automation token이면 OTP 생략.

## 3. publish 후 검증

```powershell
# npm registry에서 메타 확인
npm view @aicqtools/cli
npm view @aicqtools/core
npm view @aicqtools/rule-sdk
npm view @aicqtools/guardrail
npm view @aicqtools/provenance

# 각 출력에 "version: 1.0.0-alpha.2", "dist-tags: alpha" 확인
```

신규 임시 디렉토리에서 install 테스트:

```powershell
cd $env:TEMP
mkdir aicq-install-test
cd aicq-install-test
pnpm init
pnpm add -D @aicqtools/cli@alpha
npx aicq --version
# v1.0.0-alpha.2 또는 비슷
npx aicq check --help
```

문제 없으면 publish 성공.

## 4. v1.0.0-alpha.2 git tag + GitHub Release

publish 검증 후 tag + Release notes 게시:

```powershell
cd D:\AI\Projects\aicq
git tag -a v1.0.0-alpha.2 -m "v1.0.0-alpha.2 — first npm publish"
git push origin v1.0.0-alpha.2
```

GitHub Release 폼: https://github.com/aicqtools/aicqtools/releases/new
- Tag: `v1.0.0-alpha.2`
- Title: `aicq v1.0.0-alpha.2 — first npm publish`
- Description: `CHANGELOG.md`의 [v1.0.0-alpha.2] 섹션 복사
- ✅ **Set as a pre-release** 체크 (alpha 단계)

## 5. 실패 시 복구

### case A — `npm ERR! 403 Forbidden`

원인: token 권한 부족, organization 미생성, 또는 이름 충돌.

확인:
1. token이 `@aicqtools/*` 범위 가지는지
2. https://www.npmjs.com/org/aicqtools 가 본인 소유인지
3. `npm whoami` 실행 → 본인 username 확인

### case B — `npm ERR! private package`

원인: `package.json`의 `"private": true` 잔존.

이번 v1.0.0-alpha.2 prep commit에서 5개 publishable 워크스페이스의 `private`은 이미 제거. `packages/action`만 GitHub Action 전용으로 `private: true` 유지 (publish 대상 아님).

### case C — 잘못된 버전 publish

npm은 publish 후 24시간 이내에만 unpublish 가능 (그 후 영구 보존):

```powershell
# 24h 이내
npm unpublish @aicqtools/<name>@1.0.0-alpha.2

# 24h 초과: deprecated 메시지 추가만 가능
npm deprecate @aicqtools/<name>@1.0.0-alpha.2 "Broken release — use v1.0.0-alpha.3"
# 그 후 alpha.3로 다시 publish
```

> ⚠️ 같은 버전을 unpublish해도 **24시간 이후에 같은 버전 publish는 영구 차단**. 항상 다음 버전으로 올림 (alpha.3, alpha.4, …).

### case D — workspace dependency가 `workspace:*` 그대로 publish됨

pnpm은 publish 시점에 `workspace:*`를 실제 버전 (`^1.0.0-alpha.2`)으로 자동 변환. 변환 안 됐으면:

1. `pnpm publish` 대신 `npm publish` 사용 시 발생 가능 → `pnpm publish`만 사용
2. 또는 `pnpm exec workspace-protocol-resolve` 같은 스크립트로 사전 변환

### case E — OTP 시간 초과

npm 2FA OTP는 30초 윈도우. 천천히 입력하면 만료. 다시 시도.

Automation token은 OTP 우회. CI에서 publish할 때만 사용 권장 (보안 trade-off).

## 6. 후속 작업 (publish 후)

1. README 배지 추가 — `[![npm](https://img.shields.io/npm/v/@aicqtools/cli/alpha)](https://www.npmjs.com/package/@aicqtools/cli)`
2. GeekNews/OKKY 글 게시 (`docs/marketing/`) — npm 설치 경로 확정 후가 임팩트 큼
3. 다음 alpha (alpha.3) 버전 bump — Phase 1b 마무리 작업 (Cursor SQLite, 룰 정밀도) 후

## 7. 보안 체크리스트

- [ ] `.npmrc`가 `.gitignore`에 있음 (이미 OK)
- [ ] 토큰은 fine-grained, `@aicqtools/*` 범위만
- [ ] 토큰 만료 ≤ 90일
- [ ] 사용 후 즉시 revoke
- [ ] 2FA Authenticator app 등록
- [ ] publish 직후 `npm view`로 메타 확인 — secrets / src/ 누설 없는지
- [ ] 누설 발견 시 즉시 `npm unpublish` (24h 이내) + 토큰 rotate
