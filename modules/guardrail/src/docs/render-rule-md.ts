import type { Severity } from '@aicqtools/core';
import type { Rule } from '@aicqtools/rule-sdk';

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
