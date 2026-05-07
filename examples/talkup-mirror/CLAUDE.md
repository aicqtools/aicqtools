<!-- aicq:rules:start -->
# AI 코딩 가이드라인

아래 규칙은 aicq가 커밋 단계에서 강제합니다. 자동 생성된 내용 — 수정은 `aicq/rules/` 에서.


## 오류 (반드시 지킬 것)

### controller-needs-async-wrapper
비동기 라우트 핸들러는 asyncWrapper / asyncHandler로 감싸야 합니다.
- Languages: typescript, javascript, tsx

### enforce-utf8-encoding
파일이 UTF-8 외 인코딩으로 보입니다 (U+FFFD 검출) — UTF-8로 재저장하세요.
- Languages: typescript, javascript, tsx, python

### fk-needs-on-delete
FK 관계에 명시적 `onDelete` 정책이 빠졌습니다.
- Languages: typescript, javascript

### no-bare-except
bare `except:`는 SystemExit/KeyboardInterrupt까지 잡습니다 — 예외 타입을 명시하세요.
- Languages: python

### no-bare-throw
raw 값 대신 Error 인스턴스를 throw 하세요 (스택 트레이스 + instanceof 검사 가능).
- Languages: typescript, javascript, tsx

### no-direct-anthropic
llmClient 싱글톤을 사용하세요. 직접 Anthropic 인스턴스화는 금지입니다.
- Languages: typescript

### no-direct-openai
llmClient 싱글톤을 사용하세요. 직접 OpenAI 인스턴스화는 금지입니다.
- Languages: typescript

### no-empty-catch
catch 블록은 비어 있을 수 없습니다 — log하거나 rethrow하세요.
- Languages: typescript, javascript, tsx

### no-fstring-sql
f-string으로 SQL 조합은 SQL 주입 위험 — 파라미터 바인딩을 사용하세요.
- Languages: python

### no-id-overwrite
`.id` 필드는 생성 후 재할당하지 마세요. ID는 불변이어야 합니다.
- Languages: typescript, javascript, tsx

### no-mutable-default-arg
가변 기본 인자(list/dict/set)는 모든 호출에 공유됩니다 — None을 기본값으로 두고 함수 내부에서 초기화하세요.
- Languages: python

### no-pickle
pickle.loads/load는 안전하지 않습니다 — 신뢰할 수 없는 데이터 역직렬화 금지. json 또는 msgpack을 사용하세요.
- Languages: python

### no-shell-true
subprocess의 shell=True는 명령어 주입 위험 — 인자를 리스트로 전달하세요.
- Languages: python

### requests-needs-timeout
requests 호출에 `timeout=...` 누락 — 무한 대기 위험.
- Languages: python

### route-needs-auth
라우트에 인증 미들웨어가 빠졌습니다 (`authenticate` / `requireAuth` 등).
- Languages: typescript, javascript, tsx

### route-needs-rate-limit
새 라우트에 rate-limit 미들웨어가 빠졌습니다.
- Languages: typescript, javascript, tsx


## 경고

### api-response-shape
API 응답은 { success, data, message } 표준 형태여야 합니다.
- Languages: typescript, javascript, tsx

### async-await-consistency
`async def` 함수에 `await`가 없습니다 — 일반 `def`로 정의하세요.
- Languages: python

### camelcase-migration-column
Sequelize 마이그레이션 컬럼명은 모델과 일치하도록 camelCase 사용 (snake_case는 underscored 옵션 충돌 위험).
- Languages: typescript, javascript

### explicit-kst-timezone
`timeZone` 옵션 없는 locale 날짜 메서드는 환경별 결과 차이 — `Asia/Seoul` 명시 권장.
- Languages: typescript, javascript, tsx

### naver-kakao-oauth-webview
Capacitor Browser.open()으로 카카오/네이버 OAuth URL — 콜백 연속성을 위해 WebView 내 웹 플로우 권장.
- Languages: typescript, javascript, tsx

### no-console-log
운영 코드에서 console.log 사용을 피하세요.
- Languages: typescript, javascript, tsx

### no-default-export-from-libs
라이브러리는 named export를 사용하세요 (default export는 tree-shaking·이름 변경에 불리).
- Languages: typescript, javascript, tsx

### no-foo
이 코드베이스에서 foo() 호출은 금지됩니다.
- Languages: typescript, javascript, tsx

### no-inline-date
인라인 `new Date()` 호출 금지. 테스트 가능·타임존 인식을 위해 dateHelper를 사용하세요.
- Languages: typescript

### no-inline-math-round
Math.round 인라인 사용 금지. 일관된 반올림 규칙을 위해 mathHelper를 사용하세요.
- Languages: typescript

### no-jsonb-circular
ORM/요청/응답 객체에 JSON.stringify는 순환 참조 위험 — safeStringify 또는 명시적 필드 선택 권장.
- Languages: typescript, javascript, tsx

### no-print-in-prod
운영 코드에서 print() 사용 지양 — 표준 `logging` 모듈을 사용하세요.
- Languages: python

### no-process-env-leak
`process.env` 직접 접근 금지 — config 모듈(config/env.ts)을 통해서만 읽으세요.
- Languages: typescript, javascript, tsx

### pytest-fixture-naming
pytest fixture 함수는 `test_`로 시작하면 안 됩니다 (테스트로 인식되어 버립니다).
- Languages: python

### rfc5987-korean-filename
한글 파일명 Content-Disposition은 RFC 5987 인코딩 필요 (`filename*=UTF-8''...`).
- Languages: typescript, javascript, tsx


## 정보

### korean-comment-encoding
주석에 깨진 한글로 보이는 패턴이 있습니다 — 파일 인코딩을 확인하세요.
- Languages: typescript, javascript, tsx, python

### no-boolean-trap
함수 인자에 boolean 단독은 호출부에서 의미가 불분명합니다 — 옵션 객체를 권장합니다.
- Languages: typescript, javascript, tsx

### no-magic-number
매직 넘버 — 명명된 상수로 추출해 의미를 명확히 하세요.
- Languages: typescript, javascript, tsx

### prefer-const-array
재할당하지 않는 배열은 `const`를 사용하세요 (push/splice 같은 mutation은 const에서도 가능).
- Languages: typescript, javascript, tsx

### prefer-named-imports
`import * as X` 네임스페이스 import 지양 — tree-shaking을 위해 named import 권장.
- Languages: typescript, javascript, tsx

### type-hint-required-public
public 함수에 반환 타입 어노테이션 누락 (`-> Type:`).
- Languages: python

### won-format-thousands
원화 금액은 천단위 콤마 권장: `5000원` → `5,000원`.
- Languages: typescript, javascript, tsx
<!-- aicq:rules:end -->
