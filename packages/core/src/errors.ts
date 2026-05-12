export class ParserError extends Error {
  readonly filePath: string;
  override readonly cause: Error;
  constructor(filePath: string, cause: Error) {
    super(`parser failed on ${filePath}: ${cause.message}`);
    this.name = 'ParserError';
    this.filePath = filePath;
    this.cause = cause;
  }
}
