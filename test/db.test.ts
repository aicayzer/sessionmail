import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { getDb } from "../src/db.js";

function tempDbPath(): string {
  const dir = mkdtempSync(join(tmpdir(), "sessionmail-test-"));
  return join(dir, "mailbox.db");
}

test("getDb creates the conversations and messages tables", () => {
  const db = getDb(tempDbPath());
  const tables = (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map(
    (row) => row.name
  );
  assert.ok(tables.includes("conversations"));
  assert.ok(tables.includes("messages"));
});

test("getDb reopens a fresh connection when the path changes", () => {
  const first = getDb(tempDbPath());
  const second = getDb(tempDbPath());
  assert.notEqual(first, second);
});

test("ensureSeqColumn backfills per-conversation seq on a pre-migration database", () => {
  const dbPath = tempDbPath();

  // Build the pre-seq schema directly, bypassing getDb (whose cache would
  // otherwise skip re-running the migration on a second call for this path).
  const pre = new DatabaseSync(dbPath);
  pre.exec(`
    CREATE TABLE conversations (
      code TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL REFERENCES conversations(code),
      provenance TEXT NOT NULL,
      text TEXT NOT NULL,
      sent_at TEXT NOT NULL
    );
    INSERT INTO conversations (code, title, created_at) VALUES ('legacy-code-1', 'legacy', '2026-01-01T00:00:00.000Z');
    INSERT INTO messages (code, provenance, text, sent_at) VALUES
      ('legacy-code-1', '{}', 'first', '2026-01-01T00:00:01.000Z'),
      ('legacy-code-1', '{}', 'second', '2026-01-01T00:00:02.000Z');
  `);
  pre.close();

  const migrated = getDb(dbPath);
  const rows = migrated
    .prepare("SELECT seq, text FROM messages WHERE code = 'legacy-code-1' ORDER BY id")
    .all() as { seq: number; text: string }[];
  assert.deepEqual(
    rows.map((r) => r.seq),
    [1, 2]
  );
});
