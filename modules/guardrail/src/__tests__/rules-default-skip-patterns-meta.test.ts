import { describe, expect, it } from 'vitest';
import noConsoleLog, { SKIP_FILE_RE as NO_CONSOLE_LOG_SKIP } from '../rules-default/no-console-log.js';
import noEmptyCatch, { SKIP_FILE_RE as NO_EMPTY_CATCH_SKIP } from '../rules-default/no-empty-catch.js';
import noMagicNumber, { SKIP_FILE_RE as NO_MAGIC_NUMBER_SKIP } from '../rules-default/no-magic-number.js';

/**
 * Alpha.12 项목 A B축 가드 — 룰 메타의 `skipPatterns`가 룰 본체의 런타임 `SKIP_FILE_RE`와
 * 같은 RegExp 인스턴스를 가리켜야 한다는 invariant. 메타와 실 코드가 어긋나면
 * `aicq rules suggest`가 사용자에게 거짓 정보를 흘리게 되므로 회귀 가드로 영구화.
 */
describe('default rules expose SKIP_FILE_RE via skipPatterns meta', () => {
  it('no-console-log meta matches runtime SKIP_FILE_RE', () => {
    expect(noConsoleLog.skipPatterns).toBeDefined();
    expect(noConsoleLog.skipPatterns).toHaveLength(1);
    expect(noConsoleLog.skipPatterns?.[0]).toBe(NO_CONSOLE_LOG_SKIP);
  });

  it('no-empty-catch meta matches runtime SKIP_FILE_RE', () => {
    expect(noEmptyCatch.skipPatterns).toBeDefined();
    expect(noEmptyCatch.skipPatterns).toHaveLength(1);
    expect(noEmptyCatch.skipPatterns?.[0]).toBe(NO_EMPTY_CATCH_SKIP);
  });

  it('no-magic-number meta matches runtime SKIP_FILE_RE', () => {
    expect(noMagicNumber.skipPatterns).toBeDefined();
    expect(noMagicNumber.skipPatterns).toHaveLength(1);
    expect(noMagicNumber.skipPatterns?.[0]).toBe(NO_MAGIC_NUMBER_SKIP);
  });
});
