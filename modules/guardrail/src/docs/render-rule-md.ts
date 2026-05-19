import type { Severity } from '@aicqtools/core';
import type { Rule } from '@aicqtools/rule-sdk';
import type { ZodTypeAny } from 'zod';

const SEVERITY_LABEL_EN: Record<Severity, string> = {
  error: '🔴 error',
  warning: '🟡 warning',
  info: 'ℹ️ info',
};

const SEVERITY_LABEL_KO: Record<Severity, string> = {
  error: '🔴 오류',
  warning: '🟡 경고',
  info: 'ℹ️ 정보',
};

function languagesText(rule: Rule): string {
  const langs = Array.isArray(rule.language) ? rule.language : [rule.language];
  return langs.join(', ');
}

function ruleKindLabel(rule: Rule, locale: 'ko' | 'en'): string {
  if (rule.kind === 'pattern') return locale === 'ko' ? 'YAML 패턴' : 'YAML pattern';
  return locale === 'ko' ? 'JS/TS 함수' : 'JS/TS function';
}

/**
 * Alpha.14 — render the rule's `options` zod schema as a markdown table. Best-effort
 * introspection: works for `z.object({ key: z.array(z.string()).default(...) })` shapes and
 * similar. Anything we can't introspect cleanly falls back to "see source for shape".
 */
function describeZodType(schema: ZodTypeAny): string {
  const def = (schema as { _def?: { typeName?: string } })._def;
  switch (def?.typeName) {
    case 'ZodString':
      return 'string';
    case 'ZodNumber':
      return 'number';
    case 'ZodBoolean':
      return 'boolean';
    case 'ZodArray': {
      const inner = (def as { type?: ZodTypeAny }).type;
      return inner ? `array<${describeZodType(inner)}>` : 'array';
    }
    case 'ZodDefault': {
      const inner = (def as { innerType?: ZodTypeAny }).innerType;
      return inner ? describeZodType(inner) : 'unknown';
    }
    case 'ZodOptional': {
      const inner = (def as { innerType?: ZodTypeAny }).innerType;
      return inner ? `${describeZodType(inner)}?` : 'unknown?';
    }
    case 'ZodEnum': {
      const values = (def as { values?: readonly string[] }).values;
      return values ? values.map((v) => `'${v}'`).join(' | ') : 'enum';
    }
    case 'ZodUnion':
      return 'union';
    case 'ZodObject':
      return 'object';
    default:
      return 'unknown';
  }
}

function renderOptionsTable(
  schema: ZodTypeAny,
  defaults: Readonly<Record<string, unknown>>,
  locale: 'ko' | 'en',
): string | null {
  const def = (schema as { _def?: { typeName?: string; shape?: () => Record<string, ZodTypeAny> } })._def;
  if (def?.typeName !== 'ZodObject' || typeof def.shape !== 'function') {
    return locale === 'ko' ? '_옵션 스키마 구조 확인은 룰 소스를 참고하세요._' : '_See rule source for option schema shape._';
  }
  const shape = def.shape();
  const keys = Object.keys(shape);
  if (keys.length === 0) return null;
  const header =
    locale === 'ko'
      ? '| 키 | 타입 | 기본값 |\n|----|------|--------|'
      : '| Key | Type | Default |\n|-----|------|---------|';
  const rows = keys.map((key) => {
    const fieldSchema = shape[key]!;
    const type = describeZodType(fieldSchema);
    const def = defaults[key];
    const defaultStr =
      def === undefined ? '—' : '`' + JSON.stringify(def) + '`';
    return `| \`${key}\` | \`${type}\` | ${defaultStr} |`;
  });
  return [header, ...rows].join('\n');
}

function renderOptionsSection(rule: Rule, locale: 'ko' | 'en'): string[] {
  if (!rule.options) return [];
  const heading = locale === 'ko' ? '## 옵션 (alpha.14)' : '## Options (alpha.14)';
  const intro =
    locale === 'ko'
      ? '`aicq.config.yaml`에서 `rules.<룰 id>.options`로 재정의 가능. 잘못된 키/타입은 stderr 경고 후 기본값으로 복귀.'
      : 'Override under `rules.<rule id>.options` in `aicq.config.yaml`. Invalid keys/types trigger a stderr warning and fall back to defaults.';
  const table = renderOptionsTable(rule.options.schema, rule.options.defaults, locale);
  const lines = [heading, '', intro, ''];
  if (table) lines.push(table, '');
  const example = locale === 'ko' ? '예시:' : 'Example:';
  lines.push(
    example,
    '',
    '```yaml',
    'modules:',
    '  guardrail:',
    '    rules:',
    `      ${rule.id}:`,
    '        options:',
  );
  for (const [k, v] of Object.entries(rule.options.defaults)) {
    lines.push(`          ${k}: ${JSON.stringify(v)}`);
  }
  lines.push('```', '');
  return lines;
}

export function renderRuleMarkdown(rule: Rule, locale: 'ko' | 'en'): string {
  const messages = locale === 'ko' && rule.messageKo ? rule.messageKo : rule.message;
  const severityLabel = locale === 'ko' ? SEVERITY_LABEL_KO[rule.severity] : SEVERITY_LABEL_EN[rule.severity];
  const docsLink = rule.docs ? `\n**Docs**: ${rule.docs}` : '';

  if (locale === 'ko') {
    return [
      `# ${rule.id}`,
      '',
      `**Severity**: ${severityLabel}  `,
      `**Languages**: ${languagesText(rule)}  `,
      `**Kind**: ${ruleKindLabel(rule, 'ko')}${docsLink}`,
      '',
      '## 설명',
      '',
      messages,
      '',
      ...renderOptionsSection(rule, 'ko'),
      '## 위반 예시',
      '',
      '```typescript',
      '// 룰별 구체 예제는 추후 추가 (커뮤니티 PR 환영)',
      '```',
      '',
      '## 통과 예시',
      '',
      '```typescript',
      '// 룰별 구체 예제는 추후 추가',
      '```',
      '',
      '## 알려진 한계',
      '',
      '- PoC 단계 룰입니다 — false positive 가능성이 있으며, 출시 후 커뮤니티 피드백을 통해 정밀도를 높입니다.',
      '',
      '## 비활성화',
      '',
      '특정 프로젝트에서 이 룰을 끄려면 `aicq.config.yaml`에:',
      '',
      '```yaml',
      'modules:',
      '  guardrail:',
      '    rules:',
      `      ${rule.id}: off`,
      '```',
      '',
    ].join('\n');
  }

  return [
    `# ${rule.id}`,
    '',
    `**Severity**: ${severityLabel}  `,
    `**Languages**: ${languagesText(rule)}  `,
    `**Kind**: ${ruleKindLabel(rule, 'en')}${docsLink}`,
    '',
    '## Description',
    '',
    messages,
    '',
    ...renderOptionsSection(rule, 'en'),
    '## Violation example',
    '',
    '```typescript',
    '// Rule-specific examples to be added (community PRs welcome)',
    '```',
    '',
    '## Passing example',
    '',
    '```typescript',
    '// Rule-specific examples to be added',
    '```',
    '',
    '## Known limitations',
    '',
    '- PoC-grade rule — false positives possible. Precision will improve via community feedback after release.',
    '',
    '## Disabling this rule',
    '',
    'In `aicq.config.yaml`:',
    '',
    '```yaml',
    'modules:',
    '  guardrail:',
    '    rules:',
    `      ${rule.id}: off`,
    '```',
    '',
  ].join('\n');
}

export function renderRulesIndex(rules: readonly Rule[], locale: 'ko' | 'en'): string {
  const sorted = [...rules].sort((a, b) => a.id.localeCompare(b.id));
  const header =
    locale === 'ko'
      ? `# 룰셋 (${rules.length}개)\n\naicq의 빌트인 룰 전체 목록.\n\n| ID | Severity | Languages | 설명 |\n|----|----------|-----------|------|`
      : `# Ruleset (${rules.length} rules)\n\nAll built-in aicq rules.\n\n| ID | Severity | Languages | Description |\n|----|----------|-----------|-------------|`;
  const rows = sorted.map((r) => {
    const langs = Array.isArray(r.language) ? r.language.join(', ') : r.language;
    const msg = (locale === 'ko' && r.messageKo ? r.messageKo : r.message).replace(/\n/g, ' ').slice(0, 80);
    return `| [\`${r.id}\`](./${r.id}.md) | ${r.severity} | ${langs} | ${msg} |`;
  });
  return [header, ...rows, ''].join('\n');
}
