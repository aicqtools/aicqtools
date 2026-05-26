# capacitor-kakao-oauth-mirror — Capacitor + 카카오/네이버 OAuth 안티패턴 시연

> Capacitor 앱에서 카카오/네이버 OAuth를 외부 브라우저로 띄우면 콜백 연속성이 깨지는 한국 모바일 앱의 반복 안티패턴을 의도적으로 심어둔 미러 예제.

## 🇰🇷 한국어

### 무엇을 시연하는가

`src/auth/kakao-login.ts` — **위반 2건** 의도적으로 포함:

| # | 룰 ID | 심각도 | 위반 위치 |
|---|------|-------|---------|
| 1 | `naver-kakao-oauth-webview` | warning | `Browser.open({ url: 'https://kauth.kakao.com/oauth/authorize?...' })` — Chrome Custom Tab으로 카카오 OAuth를 외부에 띄움 |
| 2 | `naver-kakao-oauth-webview` | warning | `Browser.open({ url: 'https://nid.naver.com/oauth2.0/authorize?...' })` — 네이버 OAuth도 동일 패턴 |

`src/auth/kakao-login-good.ts` — **위반 0**, 같은 시나리오를 in-app router 기반 WebView flow로 재작성.

### 왜 이 안티패턴이 문제인가

Capacitor의 `Browser.open()`은 Android에서 Chrome Custom Tab을 외부 프로세스로 띄운다. 카카오/네이버 OAuth는 콜백 시 `kakaotalk://` 또는 `naverapp://` 스킴을 통해 인앱으로 복귀를 시도하는데, 외부 탭에서 발급된 토큰/세션 쿠키가 인앱 WebView 세션으로 이양되지 않는 경우가 있다. 결과적으로 **사용자 화면은 로그인 성공처럼 보이지만 앱이 다시 로그인 페이지로 돌아가는** 미스매치가 발생한다.

대안: **router로 in-app 페이지를 push해 같은 WebView 세션 안에서 OAuth URL을 로드**한다. 콜백이 같은 컨텍스트에서 일어나므로 토큰 유실이 없다.

### 직접 실행 — 30초 quickstart (npm publish 버전)

외부 사용자가 가장 빠르게 돌려보는 경로:

```bash
git clone https://github.com/aicqtools/aicqtools.git
cd aicqtools/examples/capacitor-kakao-oauth-mirror
npx --package=@aicqtools/cli@beta aicq check --locale ko --no-cache
```

(또는 모노레포 루트에서 `pnpm install && pnpm -w build` 후 `node ../../packages/cli/dist/bin.js check --locale ko --no-cache` — 빌드된 로컬 바이너리 사용)

기대 출력:

```
✗ src/auth/kakao-login.ts:21  naver-kakao-oauth-webview  warning
✗ src/auth/kakao-login.ts:27  naver-kakao-oauth-webview  warning
```

`kakao-login-good.ts`는 진단 0건이어야 합니다.

> 측정 시점: 2026-05-21 (v1.0.0-beta.1). 베타.2까지 룰셋·검출 결과 동일.

### `aicq init --stack capacitor`와의 관계

이 예제의 `aicq.config.yaml`은 `aicq init --stack capacitor` 출력과 동일합니다 — `ios/`, `android/`, `www/`, `public/native-bridge.*` 자동 제외. 즉 신규 Capacitor 프로젝트에서 `aicq init --stack capacitor`만 한 번 돌리면 이 예제와 같은 baseline config를 얻습니다.

관련 자료:
- [AI 어시스턴트 단독 사용 vs aicqtools — 토큰·비용·결정론 비교](../../docs/marketing/blog-vs-ai-assistant.ko.md)
- [TalkUp 205,069 LOC 케이스 스터디](../../docs/case-studies/talkup-30k.md)
- [aicqtools README — 한국 IT 컨벤션 룰 7개](../../README.md)

---

## 🇬🇧 English

### What this mirrors

`src/auth/kakao-login.ts` deliberately ships **2 violations** of the same rule:

| # | Rule ID | Severity | Where |
|---|---------|----------|-------|
| 1 | `naver-kakao-oauth-webview` | warning | `Browser.open({ url: 'https://kauth.kakao.com/oauth/authorize?...' })` — Kakao OAuth in a Chrome Custom Tab |
| 2 | `naver-kakao-oauth-webview` | warning | `Browser.open({ url: 'https://nid.naver.com/oauth2.0/authorize?...' })` — Same anti-pattern for Naver OAuth |

`src/auth/kakao-login-good.ts` is the **zero-violation** rewrite — same flow routed through an in-app WebView page.

### Why this anti-pattern hurts

Capacitor's `Browser.open()` opens a Chrome Custom Tab in a separate process on Android. Kakao and Naver OAuth callbacks try to return to the app via `kakaotalk://` / `naverapp://` schemes, but tokens / session cookies issued inside the external tab don't always migrate back into the in-app WebView session. The visible symptom: **the user sees a successful login screen, then the app bounces back to the login page** because the WebView session never received the token.

The fix: **push an in-app page via the router and load the OAuth URL inside the same WebView session.** The callback resolves in the same context, so no token is lost.

### Run it — 30-second quickstart (published npm version)

The fastest path for an outside reader:

```bash
git clone https://github.com/aicqtools/aicqtools.git
cd aicqtools/examples/capacitor-kakao-oauth-mirror
npx --package=@aicqtools/cli@beta aicq check --locale en --no-cache
```

(Or from the monorepo root: `pnpm install && pnpm -w build`, then `node ../../packages/cli/dist/bin.js check --locale en --no-cache` for the local built binary.)

Expected output:

```
✗ src/auth/kakao-login.ts:21  naver-kakao-oauth-webview  warning
✗ src/auth/kakao-login.ts:27  naver-kakao-oauth-webview  warning
```

`kakao-login-good.ts` should emit zero diagnostics.

> Measured 2026-05-21 on v1.0.0-beta.1. Ruleset and detections unchanged through beta.2.

### Relation to `aicq init --stack capacitor`

This example's `aicq.config.yaml` mirrors the output of `aicq init --stack capacitor` — auto-exclude for `ios/`, `android/`, `www/`, and `public/native-bridge.*`. Run `aicq init --stack capacitor` once in a fresh Capacitor project and you'll start from the same baseline shown here.

Related reading:
- [AI assistants alone vs aicqtools — cost, accuracy, determinism compared](../../docs/marketing/blog-vs-ai-assistant.en.md)
- [TalkUp 205,069-LOC case study](../../docs/case-studies/talkup-30k.en.md)
- [aicqtools README — 7 Korean IT convention rules](../../README.en.md)
