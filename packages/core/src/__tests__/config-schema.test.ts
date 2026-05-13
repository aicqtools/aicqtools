import { describe, expect, it } from 'vitest';
import { aicqConfigSchema } from '../config/schema.js';

describe('guardrail.overrides — alpha.8 schema shape', () => {
  it('defaults to an empty array when unspecified', () => {
    const cfg = aicqConfigSchema.parse({});
    expect(cfg.modules.guardrail.overrides).toEqual([]);
  });

  it('parses a typical overrides entry with paths + rules map', () => {
    const cfg = aicqConfigSchema.parse({
      modules: {
        guardrail: {
          overrides: [
            { paths: ['**/scripts/**'], rules: { 'no-console-log': 'off' } },
          ],
        },
      },
    });
    expect(cfg.modules.guardrail.overrides).toEqual([
      { paths: ['**/scripts/**'], rules: { 'no-console-log': 'off' } },
    ]);
  });

  it('requires at least one path glob per entry', () => {
    expect(() =>
      aicqConfigSchema.parse({
        modules: { guardrail: { overrides: [{ paths: [], rules: {} }] } },
      }),
    ).toThrow();
  });

  it('rejects invalid rule levels', () => {
    expect(() =>
      aicqConfigSchema.parse({
        modules: {
          guardrail: {
            overrides: [{ paths: ['x'], rules: { 'no-console-log': 'maybe' } }],
          },
        },
      }),
    ).toThrow();
  });
});
