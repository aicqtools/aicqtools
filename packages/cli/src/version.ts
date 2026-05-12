import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

let cached: string | undefined;

export function getCliVersion(): string {
  if (cached !== undefined) return cached;
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    try {
      const candidate = join(dir, 'package.json');
      const parsed = JSON.parse(readFileSync(candidate, 'utf-8')) as {
        name?: unknown;
        version?: unknown;
      };
      if (parsed.name === '@aicqtools/cli' && typeof parsed.version === 'string') {
        cached = parsed.version;
        return cached;
      }
    } catch {
      // not this level; keep walking
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  cached = '0.0.0';
  return cached;
}
