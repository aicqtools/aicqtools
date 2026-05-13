import { describe, expect, it } from 'vitest';
import { runFileWithSource } from '../runner/run-file.js';
import noProcessEnvLeak from '../rules-default/no-process-env-leak.js';

const rules = [noProcessEnvLeak];
const SRC = 'const a = process.env.MY_API;\n';

describe('no-process-env-leak — `*.config.*` allow-list (alpha.7 regex fix)', () => {
  // Before alpha.7 the regex required `config` to be preceded by `/`, `\`, or start-of-path,
  // which meant `next.config.ts` (preceded by `.`) leaked. Same for vite/jest/etc.

  it('allows process.env in a config/ directory (carried over)', () => {
    expect(runFileWithSource('src/config/env.ts', SRC, 'typescript', rules).diagnostics).toHaveLength(0);
  });

  it('allows process.env in `next.config.ts`', () => {
    expect(runFileWithSource('next.config.ts', SRC, 'typescript', rules).diagnostics).toHaveLength(0);
  });

  it('allows process.env in `vite.config.ts`', () => {
    expect(runFileWithSource('vite.config.ts', SRC, 'typescript', rules).diagnostics).toHaveLength(0);
  });

  it('allows process.env in `jest.config.ts`', () => {
    expect(runFileWithSource('jest.config.ts', SRC, 'typescript', rules).diagnostics).toHaveLength(0);
  });

  it('still flags process.env in a regular service file', () => {
    expect(runFileWithSource('src/services/user.ts', SRC, 'typescript', rules).diagnostics.length).toBeGreaterThan(0);
  });
});
