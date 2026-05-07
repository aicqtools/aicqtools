# Pre-commit hook 셋업 가이드 (한국어)

`aicq check`를 git commit 단계에서 자동으로 실행해 위반 코드가 저장소에 들어가지 못하도록 차단합니다. **husky** 와 **lefthook** 두 가지 방법을 안내합니다.

> 권장: TypeScript/JavaScript 프로젝트는 husky, polyglot/Go 친화적 프로젝트는 lefthook.

## 옵션 A — husky (Node.js 생태계 표준)

### 1. 설치

```bash
pnpm add -D husky
pnpm exec husky init
```

`husky init`이 `.husky/` 디렉토리와 `pre-commit` 샘플 파일을 만듭니다.

### 2. `.husky/pre-commit` 작성

기존 파일 내용을 다음으로 교체:

```sh
#!/usr/bin/env sh
npx aicq check
```

> aicq를 글로벌이 아니라 devDependency로 설치한 경우 `npx`가 자동으로 로컬 `node_modules/.bin/aicq`를 찾아 실행합니다.

### 3. (선택) staged 파일만 검사

전체 프로젝트가 아니라 staged 변경분만 빠르게 검사하려면 `lint-staged`와 조합:

```bash
pnpm add -D lint-staged
```

`package.json`에 추가:
```json
{
  "lint-staged": {
    "*.{ts,tsx,js,mjs,cjs,jsx,py}": "aicq check --no-cache"
  }
}
```

`.husky/pre-commit`을 다음으로 교체:
```sh
npx lint-staged
```

> 트레이드오프: staged-only는 빠르지만 cross-file 위반(예: 한 파일이 다른 파일의 export를 잘못 쓰는 경우)을 놓칠 수 있음. v1.0에선 전체 검사 + sqlite 캐시(`packages/core/src/cache/sqlite.ts`)로 충분히 빠름.

### 4. bypass (긴급 시)

```bash
git commit --no-verify -m "..."
```

급한 hotfix에만 사용하세요. 빈번해지면 룰을 조정하세요.

---

## 옵션 B — lefthook (Go 기반, 더 빠름)

### 1. 설치

```bash
pnpm add -D lefthook
pnpm exec lefthook install
```

### 2. `lefthook.yml` 작성

```yaml
pre-commit:
  parallel: true
  commands:
    aicq:
      run: npx aicq check
```

또는 staged-only:

```yaml
pre-commit:
  parallel: true
  commands:
    aicq:
      glob: "*.{ts,tsx,js,mjs,cjs,jsx,py}"
      run: npx aicq check --cwd {staged_files}
```

### 3. 검증

```bash
git add <some-file>
git commit -m "test"
# → aicq check가 자동 실행, 위반 시 commit 차단
```

---

## 트러블슈팅

| 증상 | 원인 / 해결 |
|------|-----------|
| `aicq: command not found` | `pnpm add -D @aicqtools/cli` 필요. 또는 monorepo면 `pnpm install` 후 dist 빌드 (`pnpm build`) 필요 |
| commit이 너무 느림 | 전체 검사 대신 lint-staged로 staged-only 전환, 또는 `aicq check`가 자동으로 sqlite 캐시 사용 — 캐시 무효화 시점 점검 |
| 한국어 메시지가 영문으로 보임 | `aicq.config.yaml`의 `locale: ko` 설정 또는 `--locale ko` 플래그 |
| WSL/Mac 환경에서 husky가 실행 안 됨 | `.husky/pre-commit`에 실행 권한: `chmod +x .husky/pre-commit` |

---

## v1.5 예정

```bash
aicq init    # husky/lefthook 자동 셋업 + .cursorrules/CLAUDE.md 동기화 + 첫 룰 5개 추가
```

한 줄로 끝나는 셋업.

---

# Pre-commit hook setup (English)

Run `aicq check` automatically on every git commit so violating code can't enter the repo. Two approaches: **husky** (Node-friendly) and **lefthook** (Go-based, faster).

## husky

```bash
pnpm add -D husky
pnpm exec husky init
echo 'npx aicq check' > .husky/pre-commit
```

For staged-only, combine with `lint-staged`:
```json
{
  "lint-staged": {
    "*.{ts,tsx,js,mjs,cjs,jsx,py}": "aicq check --no-cache"
  }
}
```

## lefthook

```bash
pnpm add -D lefthook
pnpm exec lefthook install
```

`lefthook.yml`:
```yaml
pre-commit:
  parallel: true
  commands:
    aicq:
      run: npx aicq check
```

## Bypass

```bash
git commit --no-verify -m "..."
```
Use sparingly.
