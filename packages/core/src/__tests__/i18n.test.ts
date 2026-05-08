import { describe, it, expect } from 'vitest';
import { t, resolveLocale, messages } from '../i18n/index.js';

describe('t (translate)', () => {
  it('returns Korean message when locale=ko', () => {
    expect(t('ko', 'cli.check.noViolations')).toBe('위반 없음.');
  });
  it('returns English message when locale=en', () => {
    expect(t('en', 'cli.check.noViolations')).toBe('No violations.');
  });
  it('substitutes {param} placeholders', () => {
    const out = t('ko', 'cli.check.violationsFound', { count: 3 });
    expect(out).toBe('위반 3개 발견.');
  });
  it('leaves placeholder if param is missing', () => {
    const out = t('en', 'cli.check.violationsFound', {});
    expect(out).toContain('{count}');
  });
  it('keeps numeric params', () => {
    const out = t('en', 'cli.check.scanned', { files: 100, violations: 5, ms: 12 });
    expect(out).toBe('100 files scanned, 5 violations, 12ms');
  });
});

describe('resolveLocale', () => {
  it('uses override first', () => {
    expect(resolveLocale({ override: 'ko', env: { LANG: 'en_US' } })).toBe('ko');
  });
  it('uses LC_ALL before LANG', () => {
    expect(resolveLocale({ env: { LC_ALL: 'ko_KR.UTF-8', LANG: 'en_US' } })).toBe('ko');
  });
  it('uses LANG when LC_ALL is unset', () => {
    expect(resolveLocale({ env: { LANG: 'ko_KR.UTF-8' } })).toBe('ko');
  });
  it('uses configLocale when env is empty', () => {
    expect(resolveLocale({ configLocale: 'ko', env: {} })).toBe('ko');
  });
  it('falls back to en', () => {
    expect(resolveLocale({ env: {} })).toBe('en');
  });
  it('handles unrecognized locale by falling back', () => {
    expect(resolveLocale({ override: 'fr', env: {} })).toBe('en');
  });
});

describe('messages dictionary', () => {
  it('has matching keys for ko and en', () => {
    const koKeys = Object.keys(messages.ko).sort();
    const enKeys = Object.keys(messages.en).sort();
    expect(koKeys).toEqual(enKeys);
  });
});
