import { describe, expect, it } from 'vitest';
import { aicqConfigSchema } from '../config/schema.js';

describe('respectGitignore — alpha.9 union shape', () => {
  it('defaults to `auto` when the field is unspecified', () => {
    const cfg = aicqConfigSchema.parse({});
    expect(cfg.respectGitignore).toBe('auto');
  });

  it('accepts explicit boolean true', () => {
    const cfg = aicqConfigSchema.parse({ respectGitignore: true });
    expect(cfg.respectGitignore).toBe(true);
  });

  it('accepts explicit boolean false', () => {
    const cfg = aicqConfigSchema.parse({ respectGitignore: false });
    expect(cfg.respectGitignore).toBe(false);
  });

  it('accepts the literal string `auto`', () => {
    const cfg = aicqConfigSchema.parse({ respectGitignore: 'auto' });
    expect(cfg.respectGitignore).toBe('auto');
  });

  it('rejects any other string', () => {
    expect(() => aicqConfigSchema.parse({ respectGitignore: 'yes' })).toThrow();
  });
});

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
