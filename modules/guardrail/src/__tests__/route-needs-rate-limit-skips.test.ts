import { describe, expect, it } from 'vitest';
import { runFileWithSource } from '../runner/run-file.js';
import routeNeedsRateLimit from '../rules-default/route-needs-rate-limit.js';

const rules = [routeNeedsRateLimit];

function countViolations(
  src: string,
  filePath = 'src/api.ts',
  lang: 'typescript' | 'tsx' | 'javascript' = 'typescript',
): number {
  return runFileWithSource(filePath, src, lang, rules).diagnostics.length;
}

const ROUTE_REGISTRATION = `
const handler = () => {};
app.get('/users', handler);
router.post('/users', handler);
`;

describe('route-needs-rate-limit — built-in test/spec skip (beta.2)', () => {
  it('still flags route registration in regular src files', () => {
    expect(countViolations(ROUTE_REGISTRATION, 'src/api.ts')).toBe(2);
  });

  it('skips .spec.ts files (Nest.js typescript-starter FP surfaced beta.1 dogfood)', () => {
    // Mirrors the actual NestJS pattern: TestingModule.get(token) DI lookup
    // — same surface as Express `app.get(path, handler)` route registration.
    const src = `
      describe('AppController', () => {
        it('should return Hello World', () => {
          const appController = app.get(AppController);
          expect(appController.getHello()).toBe('Hello World!');
        });
      });
    `;
    expect(countViolations(src, 'src/app.controller.spec.ts')).toBe(0);
  });

  it('skips .test.ts files', () => {
    expect(countViolations(ROUTE_REGISTRATION, 'src/api.test.ts')).toBe(0);
  });

  it('skips files under __tests__/ directory', () => {
    expect(countViolations(ROUTE_REGISTRATION, 'src/__tests__/api.ts')).toBe(0);
  });

  it('skips e2e-spec files (Nest e2e convention)', () => {
    expect(countViolations(ROUTE_REGISTRATION, 'test/app.e2e-spec.ts')).toBe(0);
  });

  it('does NOT skip non-test path segments that merely contain "spec" (e.g. specification.ts)', () => {
    // `specification.ts` doesn't match `.spec.` (needs the dot).
    expect(countViolations(ROUTE_REGISTRATION, 'src/specification.ts')).toBe(2);
  });
});
