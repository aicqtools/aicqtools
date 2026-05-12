import type { FileCache, Language, Severity } from '@aicqtools/core';
import type { Rule } from '@aicqtools/rule-sdk';

export interface SuggestSampleLocation {
  readonly file: string;
  readonly line: number;
  readonly column: number;
}

export interface RuleSuggestion {
  readonly ruleId: string;
  readonly hits: number;
  readonly severity: Severity;
  readonly message: string;
  readonly messageKo?: string;
  readonly docs?: string;
  readonly sampleLocations: readonly SuggestSampleLocation[];
  readonly stackMatch?: boolean;
}

export type DependencySource = 'package.json' | 'requirements.txt';

export interface DetectedDependency {
  readonly name: string;
  readonly source: DependencySource;
}

export interface PatternRuleDraft {
  readonly id: string;
  readonly language: Language;
  readonly severity: 'info';
  readonly message: string;
  readonly messageKo: string;
  readonly query: string;
  readonly meta: {
    readonly count: number;
    readonly files: number;
    readonly sampleLocations: readonly SuggestSampleLocation[];
  };
}

export interface RuleSuggestionReport {
  readonly filesScanned: number;
  readonly languagesPresent: readonly Language[];
  readonly durationMs: number;
  readonly suggestions: readonly RuleSuggestion[];
  readonly detectedDependencies: readonly DetectedDependency[];
  /** A paste-ready `aicq.config.yaml` fragment that enables the suggested rules. */
  readonly configSnippet: string;
  readonly patternDrafts?: readonly PatternRuleDraft[];
}

export interface AnalyzeRepoOptions {
  readonly cwd: string;
  readonly include: readonly string[];
  readonly exclude: readonly string[];
  readonly rules: readonly Rule[];
  readonly cache?: FileCache;
  readonly top?: number;
  readonly minHits?: number;
}

export interface MinePatternsOptions {
  readonly cwd: string;
  readonly include: readonly string[];
  readonly exclude: readonly string[];
  readonly minCount?: number;
  readonly top?: number;
}
