import { describe, expect, it } from 'vitest';
import { applyRuleConfig } from '../runner/apply-rule-config.js';
import { runFileWithSource } from '../runner/run-file.js';
import maskPiiInAiPrompt from '../rules-default/mask-pii-in-ai-prompt.js';

const RRN_SRC = "openai.chat({ q: '900101-1234567' });\n";
const CARD_SRC = "anthropic.messages({ q: '4111 1111 1111 1111' });\n";
const PASSPORT_SRC = "openai.chat({ q: 'M12345678' });\n";

/**
 * Alpha.16 — `mask-pii-in-ai-prompt.piiPatterns` migration. Covers:
 *   1. defaults reproduce alpha.15 (RRN + card detected, passport not)
 *   2. extended piiPatterns catches user-supplied PII like passport numbers
 *   3. empty array = mute (no PII pattern matches even if RRN is present)
 */
describe('mask-pii-in-ai-prompt — alpha.16 piiPatterns option', () => {
  it('1. defaults reproduce alpha.15 — RRN + card flagged, passport-style ignored', () => {
    const rrnResult = runFileWithSource('src/app.ts', RRN_SRC, 'typescript', [maskPiiInAiPrompt]);
    const cardResult = runFileWithSource('src/app.ts', CARD_SRC, 'typescript', [maskPiiInAiPrompt]);
    const passportResult = runFileWithSource('src/app.ts', PASSPORT_SRC, 'typescript', [
      maskPiiInAiPrompt,
    ]);
    expect(rrnResult.diagnostics).toHaveLength(1);
    expect(cardResult.diagnostics).toHaveLength(1);
    expect(passportResult.diagnostics).toHaveLength(0);
  });

  it('2. extending piiPatterns with passport regex catches additional PII shapes', () => {
    const { rules: effective, ruleOptions } = applyRuleConfig([maskPiiInAiPrompt], {
      'mask-pii-in-ai-prompt': {
        options: {
          piiPatterns: [
            '\\b\\d{6}-\\d{7}\\b',
            '\\b(?:\\d[ -]?){15,16}\\b',
            '\\b[A-Z]\\d{8}\\b',
          ],
        },
      },
    });
    const result = runFileWithSource('src/app.ts', PASSPORT_SRC, 'typescript', effective, {
      ruleOptions,
    });
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.ruleId).toBe('mask-pii-in-ai-prompt');
  });

  it('3. piiPatterns: [] mutes the rule (even RRN/card patterns pass through)', () => {
    const { rules: effective, ruleOptions } = applyRuleConfig([maskPiiInAiPrompt], {
      'mask-pii-in-ai-prompt': { options: { piiPatterns: [] } },
    });
    const rrnResult = runFileWithSource('src/app.ts', RRN_SRC, 'typescript', effective, {
      ruleOptions,
    });
    const cardResult = runFileWithSource('src/app.ts', CARD_SRC, 'typescript', effective, {
      ruleOptions,
    });
    expect(rrnResult.diagnostics).toHaveLength(0);
    expect(cardResult.diagnostics).toHaveLength(0);
  });
});
