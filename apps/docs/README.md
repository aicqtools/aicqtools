# `@aicqtools/docs-site` — Astro docs site (Phase 1a PoC)

한·영 양면 정적 사이트. `pnpm install` 후 `pnpm dev`로 로컬 미리보기.

## 구조

```
src/
├── layouts/Layout.astro        — 공통 레이아웃 (헤더/푸터, 한·영 토글)
└── pages/
    ├── index.astro             — `/` → `/ko/`로 redirect
    ├── ko/
    │   ├── index.astro         — 홈 (한국어)
    │   ├── install.astro       — 설치 가이드
    │   └── rules.astro         — 룰셋 인덱스
    └── en/
        ├── index.astro
        ├── install.astro
        └── rules.astro
```

## 개발

```bash
cd apps/docs
pnpm dev      # http://localhost:4321
pnpm build    # → dist/ 정적 출력
pnpm preview  # 빌드 결과 미리보기
```

## 배포

- **GitHub Pages**: `astro build` → `dist/` 푸시 (별도 workflow 필요)
- **Vercel**: 루트에서 `apps/docs` 프레임워크 자동 인식
- **Cloudflare Pages**: 동일

## 다음 단계 (Phase 1b)

- `aicq docs build` 결과(`aicq-docs/rules/{ko,en}/*.md`)를 Astro Content Collections로 import
- 검색 (Pagefind)
- 다크모드
- 도메인 연결 (`aicqtools.dev`)
