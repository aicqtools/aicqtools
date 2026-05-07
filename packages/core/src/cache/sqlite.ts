import Database from 'better-sqlite3';
import { dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import type { Diagnostic } from '../types.js';

interface FileRow {
  file_path: string;
  mtime: number;
  size: number;
  rules_hash: string;
  diagnostics_json: string;
  scanned_at: number;
}

export interface CacheKey {
  readonly filePath: string;
  readonly mtime: number;
  readonly size: number;
  readonly rulesHash: string;
}

export class FileCache {
  private readonly db: Database.Database;
  private readonly getStmt: Database.Statement;
  private readonly setStmt: Database.Statement;

  constructor(dbPath: string) {
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS file_cache (
        file_path TEXT PRIMARY KEY,
        mtime INTEGER NOT NULL,
        size INTEGER NOT NULL,
        rules_hash TEXT NOT NULL,
        diagnostics_json TEXT NOT NULL,
        scanned_at INTEGER NOT NULL
      );
    `);
    this.getStmt = this.db.prepare(
      'SELECT * FROM file_cache WHERE file_path = ? AND mtime = ? AND size = ? AND rules_hash = ?',
    );
    this.setStmt = this.db.prepare(
      `INSERT INTO file_cache (file_path, mtime, size, rules_hash, diagnostics_json, scanned_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(file_path) DO UPDATE SET
         mtime = excluded.mtime,
         size = excluded.size,
         rules_hash = excluded.rules_hash,
         diagnostics_json = excluded.diagnostics_json,
         scanned_at = excluded.scanned_at`,
    );
  }

  get(key: CacheKey): readonly Diagnostic[] | null {
    const row = this.getStmt.get(key.filePath, key.mtime, key.size, key.rulesHash) as
      | FileRow
      | undefined;
    if (!row) return null;
    try {
      return JSON.parse(row.diagnostics_json) as Diagnostic[];
    } catch {
      return null;
    }
  }

  set(key: CacheKey, diagnostics: readonly Diagnostic[]): void {
    this.setStmt.run(
      key.filePath,
      key.mtime,
      key.size,
      key.rulesHash,
      JSON.stringify(diagnostics),
      Date.now(),
    );
  }

  clear(): void {
    this.db.exec('DELETE FROM file_cache');
  }

  close(): void {
    this.db.close();
  }
}
