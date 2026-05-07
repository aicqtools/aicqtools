import type { CheckResult, Diagnostic } from '../types.js';

interface SarifLog {
  $schema: string;
  version: '2.1.0';
  runs: SarifRun[];
}

interface SarifRun {
  tool: {
    driver: {
      name: string;
      version: string;
      informationUri: string;
      rules: SarifRule[];
    };
  };
  results: SarifResult[];
}

interface SarifRule {
  id: string;
  shortDescription: { text: string };
  helpUri?: string;
}

interface SarifResult {
  ruleId: string;
  level: 'error' | 'warning' | 'note';
  message: { text: string };
  locations: Array<{
    physicalLocation: {
      artifactLocation: { uri: string };
      region: {
        startLine: number;
        startColumn: number;
        endLine: number;
        endColumn: number;
      };
    };
  }>;
}

const sarifLevel = { error: 'error', warning: 'warning', info: 'note' } as const;

function ruleFromDiagnostic(d: Diagnostic): SarifRule {
  const rule: SarifRule = {
    id: d.ruleId,
    shortDescription: { text: d.message },
  };
  if (d.docs) rule.helpUri = d.docs;
  return rule;
}

function resultFromDiagnostic(d: Diagnostic): SarifResult {
  return {
    ruleId: d.ruleId,
    level: sarifLevel[d.severity],
    message: { text: d.message },
    locations: [
      {
        physicalLocation: {
          artifactLocation: { uri: d.file },
          region: {
            startLine: d.range.start.line,
            startColumn: d.range.start.column,
            endLine: d.range.end.line,
            endColumn: d.range.end.column,
          },
        },
      },
    ],
  };
}

export function reportSarif(result: CheckResult, toolVersion = '0.0.0'): string {
  const ruleMap = new Map<string, SarifRule>();
  for (const d of result.diagnostics) {
    if (!ruleMap.has(d.ruleId)) ruleMap.set(d.ruleId, ruleFromDiagnostic(d));
  }
  const log: SarifLog = {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'aicq',
            version: toolVersion,
            informationUri: 'https://github.com/aicq/aicq',
            rules: [...ruleMap.values()],
          },
        },
        results: result.diagnostics.map(resultFromDiagnostic),
      },
    ],
  };
  return JSON.stringify(log, null, 2);
}
