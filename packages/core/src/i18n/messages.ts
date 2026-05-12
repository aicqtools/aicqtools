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
  },
} as const;

export type MessageKey = keyof typeof messages.en;
