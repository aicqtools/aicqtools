import { messages, type Locale, type MessageKey } from './messages.js';

/**
 * Resolve locale from (in priority order):
 *   1. explicit `--locale` flag (passed in via override)
 *   2. `LANG` / `LC_ALL` environment variables (e.g. "ko_KR.UTF-8")
 *   3. `aicq.config.yaml`'s `locale` field
 *   4. `'en'` fallback
 */
export function resolveLocale(opts: {
  override?: string;
  configLocale?: string;
  env?: NodeJS.ProcessEnv;
}): Locale {
  const tryParse = (value: string | undefined): Locale | null => {
    if (!value) return null;
    const lower = value.toLowerCase();
    if (lower.startsWith('ko')) return 'ko';
    if (lower.startsWith('en')) return 'en';
    return null;
  };

  return (
    tryParse(opts.override) ??
    tryParse(opts.env?.['LC_ALL']) ??
    tryParse(opts.env?.['LANG']) ??
    tryParse(opts.configLocale) ??
    'en'
  );
}

const PLACEHOLDER = /\{(\w+)\}/g;

function format(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(PLACEHOLDER, (_, key: string) => {
    const value = params[key];
    return value === undefined ? `{${key}}` : String(value);
  });
}

export function t(
  locale: Locale,
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  const dict = messages[locale];
  // Fallback: locale -> en -> raw key
  const template = dict[key] ?? messages.en[key] ?? key;
  return format(template, params);
}
