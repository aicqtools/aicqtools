export type Severity = 'error' | 'warning' | 'info';

export type Language = 'typescript' | 'javascript' | 'tsx' | 'python';

export interface Position {
  readonly line: number;
  readonly column: number;
}

export interface Range {
  readonly start: Position;
  readonly end: Position;
}

export interface Fix {
  readonly range: Range;
  readonly text: string;
}

export interface Diagnostic {
  readonly ruleId: string;
  readonly severity: Severity;
  readonly message: string;
  readonly messageKo?: string;
  readonly file: string;
  readonly range: Range;
  readonly fix?: Fix;
  readonly docs?: string;
}

export interface CheckResult {
  readonly diagnostics: readonly Diagnostic[];
  readonly filesScanned: number;
  readonly durationMs: number;
}
