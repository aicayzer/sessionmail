import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
