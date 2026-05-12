/**
 * i18n 메시지 사전. 계층 dot-notation 키 — `cli.check.violationsFound`.
 *
 * 새 키 추가 시 ko/en 양쪽 모두 정의해야 합니다 (한쪽 누락 시 fallback 발생).
 * 파라미터는 `{name}` 플레이스홀더로 — 예: `'cli.check.scanned': '{count}개 검사'`.
 */

export type Locale = 'ko' | 'en';

export const messages = {
  en: {
    'cli.check.scanned': '{files} files scanned, {violations} violations, {ms}ms',
    'cli.check.noViolations': 'No violations.',
    'cli.check.violationsFound': '{count} violations found.',
    'cli.sync.updated': 'updated: {path}',
    'cli.provenance.captured': 'provenance captured: {path}',
    'cli.provenance.summary': '  {attributions} attribution(s), {sessions} session(s)',
    'cli.provenance.notImplemented': 'provenance: not implemented yet (Phase 1a)',
    'cli.docs.generated': 'rule docs generated: {count} files in {dir}',
    'cli.error.generic': 'aicq error: {message}',
    'cli.check.parserFailed': 'parser failed on {file}: {message}',
    'cli.rules.suggest.header': '{files} files scanned ({langs}), {ms}ms',
    'cli.rules.suggest.tableHeader': 'rule  hits  severity  message',
    'cli.rules.suggest.none': 'No built-in rule matched this repo. Nothing to suggest.',
    'cli.rules.suggest.detectedStack': 'Detected stack: {deps}',
    'cli.rules.suggest.configHint': 'Add to aicq.config.yaml:',
    'cli.rules.suggest.stackMatchNote': '(stack match)',
    'cli.rules.suggest.noisyNote': '(very high count — likely noisy, tune before enabling)',
    'cli.rules.suggest.patternDraftsHeader': 'Draft pattern rules ({count}) — review before placing under rulesDir:',
    'cli.rules.suggest.written': 'wrote {count} suggestion(s) to {path}',
  },
  ko: {
    'cli.check.scanned': '파일 {files}개 검사, 위반 {violations}개, {ms}ms 소요',
    'cli.check.noViolations': '위반 없음.',
    'cli.check.violationsFound': '위반 {count}개 발견.',
    'cli.sync.updated': '갱신됨: {path}',
    'cli.provenance.captured': '출처 기록 캡처: {path}',
    'cli.provenance.summary': '  attribution {attributions}건, session {sessions}건',
    'cli.provenance.notImplemented': 'provenance: 아직 미구현 (Phase 1a)',
    'cli.docs.generated': '룰 docs 생성됨: {dir}에 {count}개 파일',
    'cli.error.generic': 'aicq 오류: {message}',
    'cli.check.parserFailed': '{file} 파서 실패: {message}',
    'cli.rules.suggest.header': '파일 {files}개 검사 ({langs}), {ms}ms',
    'cli.rules.suggest.tableHeader': '룰  적중  심각도  메시지',
    'cli.rules.suggest.none': '이 저장소에 매치된 내장 룰이 없습니다. 제안할 항목 없음.',
    'cli.rules.suggest.detectedStack': '감지된 스택: {deps}',
    'cli.rules.suggest.configHint': 'aicq.config.yaml에 추가:',
    'cli.rules.suggest.stackMatchNote': '(스택 매치)',
    'cli.rules.suggest.noisyNote': '(적중 매우 많음 — 노이즈 가능성, 활성화 전 조정 권장)',
    'cli.rules.suggest.patternDraftsHeader': '룰 초안 ({count}개) — rulesDir에 두기 전 검토하세요:',
    'cli.rules.suggest.written': '제안 {count}건을 {path}에 기록',
  },
} as const;

export type MessageKey = keyof typeof messages.en;
