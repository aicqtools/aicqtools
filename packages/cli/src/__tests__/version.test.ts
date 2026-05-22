import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getCliVersion } from '../version.js';

describe('getCliVersion', () => {
  it('returns the version from packages/cli/package.json', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const pkgPath = join(here, '..', '..', 'package.json');
    const expected = (JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version: string }).version;
    expect(getCliVersion()).toBe(expected);
  });
  it('matches the beta.2 release', () => {
    expect(getCliVersion()).toBe('1.0.0-beta.2');
  });
});
