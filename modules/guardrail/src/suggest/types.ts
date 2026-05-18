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
  /**
   * True when this rule is highly likely to dominate noise budgets in the suggested config:
   * either it has substantially more hits than the next rule in the ranking, or it's an
   * info-severity rule whose hit count exceeds the absolute "obviously noisy" threshold.
   * Computed by `analyzeRepo`; consumed by both the text reporter (for a flag) and the
   * YAML config-snippet builder (to emit such rules as commented-out lines).
   */
  readonly noisy?: boolean;
  /**
   * Human-readable mirror of `RuleMeta.skipPatterns`: the `.source` of each RegExp the rule
   * auto-skips internally. Surfaced by the text reporter (`↳ auto-skipped paths: …`) and as
   * a YAML comment in the config snippet so users can see which built-in skips are active
   * without reading the rule body.
   */
  readonly skipPatterns?: readonly string[];
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
  /** Mirror of `AicqConfig.respectGitignore`. Default false. */
  readonly respectGitignore?: boolean;
}

export interface MinePatternsOptions {
  readonly cwd: string;
  readonly include: readonly string[];
  readonly exclude: readonly string[];
  readonly minCount?: number;
  readonly top?: number;
  /** Mirror of `AicqConfig.respectGitignore`. Default false. */
  readonly respectGitignore?: boolean;
}
