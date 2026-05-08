<!--
PR 작성 가이드 / PR writing guide:
- 제목은 conventional commits 형식 (예: `feat(guardrail): add no-eval rule`)
- 한국어/영어 어느 쪽이든 OK. 기여자 편한 언어로.
-->

## 변경 사항 요약 / Summary

<!-- 무엇을 / 왜 / What changed and why -->

## 종류 / Type

- [ ] 🐛 버그 수정 / Bug fix
- [ ] ✨ 새 기능 / New feature
- [ ] 📚 문서 / Docs
- [ ] ♻️ 리팩토링 / Refactor
- [ ] 🧪 테스트 추가 / Tests
- [ ] 🛠️ 빌드·CI / Build / CI
- [ ] 🌐 i18n / Translations
- [ ] 📋 새 룰 / New rule (issue 번호: #___)

## 체크리스트 / Checklist

- [ ] **DCO sign-off** — 모든 commit이 `Signed-off-by:` 트레일러 포함 (`git commit -s`)
- [ ] **테스트** — 새 기능·수정사항에 단위 테스트 추가 (`pnpm test` 통과)
- [ ] **빌드** — `pnpm build` 5개 패키지 모두 성공
- [ ] **타입 체크** — 모든 TypeScript 파일 strict 통과
- [ ] **CHANGELOG.md** — `[Unreleased]` 섹션에 변경 사항 추가 (사소한 내부 변경은 생략 가능)
- [ ] **README/docs** — 사용자 직면 변경이면 README 또는 docs 갱신
- [ ] **새 룰의 경우** — 한·영 메시지(`message`/`messageKo`) 모두 포함 + 위반/통과 단위 테스트 + index.ts 등록

## 관련 이슈 / Related issues

<!-- Closes #..., Refs #... -->

## 추가 정보 / Additional notes

<!-- 스크린샷, 벤치마크 결과, 알려진 한계 등 / Screenshots, benchmarks, known limitations -->
