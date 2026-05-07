import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function getStagedFiles(cwd: string): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['diff', '--cached', '--name-only', '--diff-filter=AM'],
      { cwd, maxBuffer: 16 * 1024 * 1024 },
    );
    return stdout.split('\n').filter((line) => line.length > 0);
  } catch {
    return [];
  }
}

export interface StagedHunk {
  readonly filePath: string;
  readonly startLine: number;
  readonly endLine: number;
}

const HUNK_HEADER = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/;
const FILE_HEADER = /^\+\+\+ b\/(.+)$/;

export async function getStagedHunks(cwd: string): Promise<StagedHunk[]> {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['diff', '--cached', '--unified=0', '--no-color'],
      { cwd, maxBuffer: 32 * 1024 * 1024 },
    );
    const hunks: StagedHunk[] = [];
    let currentFile: string | null = null;
    for (const line of stdout.split('\n')) {
      const fileMatch = FILE_HEADER.exec(line);
      if (fileMatch) {
        currentFile = fileMatch[1] ?? null;
        continue;
      }
      const hunkMatch = HUNK_HEADER.exec(line);
      if (hunkMatch && currentFile) {
        const start = parseInt(hunkMatch[1] ?? '0', 10);
        const count = hunkMatch[2] !== undefined ? parseInt(hunkMatch[2], 10) : 1;
        if (count === 0) continue;
        hunks.push({
          filePath: currentFile,
          startLine: start,
          endLine: start + count - 1,
        });
      }
    }
    return hunks;
  } catch {
    return [];
  }
}

export async function getCurrentCommitSha(cwd: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd });
    return stdout.trim();
  } catch {
    return null;
  }
}
