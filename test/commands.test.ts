import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as commands from "../src/commands.js";

function tempDbPath(): string {
  const dir = mkdtempSync(join(tmpdir(), "sessionmail-test-"));
  return join(dir, "mailbox.db");
}

test("pair then join round-trip on the same code", () => {
  const dbPath = tempDbPath();
  const { code } = commands.pair(dbPath);
  const joined = commands.join(code, dbPath);
  assert.equal(joined.code, code);
});

test("join with an unknown code throws", () => {
  const dbPath = tempDbPath();
  assert.throws(() => commands.join("nope-nope-0", dbPath));
});

test("send then check returns the message", () => {
  const dbPath = tempDbPath();
  const { code } = commands.pair(dbPath);
  commands.send(code, "hello", undefined, dbPath);
  const messages = commands.check(code, undefined, dbPath);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].text, "hello");
});

test("check --since only returns messages newer than the given id", () => {
  const dbPath = tempDbPath();
  const { code } = commands.pair(dbPath);
  const first = commands.send(code, "one", undefined, dbPath);
  commands.send(code, "two", undefined, dbPath);
  const messages = commands.check(code, first.id, dbPath);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].text, "two");
});

test("send with --title renames the conversation", () => {
  const dbPath = tempDbPath();
  const { code } = commands.pair(dbPath);
  commands.send(code, "hi", "billing bug", dbPath);
  const rows = commands.list(dbPath);
  assert.equal(rows.find((row) => row.code === code)?.title, "billing bug");
});

test("rename updates the title directly", () => {
  const dbPath = tempDbPath();
  const { code } = commands.pair(dbPath);
  commands.rename(code, "new title", dbPath);
  const joined = commands.join(code, dbPath);
  assert.equal(joined.title, "new title");
});

test("log returns full history regardless of since", () => {
  const dbPath = tempDbPath();
  const { code } = commands.pair(dbPath);
  commands.send(code, "one", undefined, dbPath);
  commands.send(code, "two", undefined, dbPath);
  assert.equal(commands.log(code, dbPath).length, 2);
});

test("purge by code deletes the conversation and its messages", () => {
  const dbPath = tempDbPath();
  const { code } = commands.pair(dbPath);
  commands.send(code, "hi", undefined, dbPath);
  const result = commands.purge(code, undefined, dbPath);
  assert.equal(result.deletedConversations, 1);
  assert.equal(result.deletedMessages, 1);
  assert.throws(() => commands.join(code, dbPath));
});

test("purge with neither a code nor --older-than throws", () => {
  const dbPath = tempDbPath();
  assert.throws(() => commands.purge(undefined, undefined, dbPath));
});

test("recent spans multiple conversations, most recent first", () => {
  const dbPath = tempDbPath();
  const a = commands.pair(dbPath);
  const b = commands.pair(dbPath);
  commands.send(a.code, "from a", undefined, dbPath);
  commands.send(b.code, "from b", undefined, dbPath);
  const rows = commands.recent(10, dbPath);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].code, b.code);
  assert.equal(rows[1].code, a.code);
});

test("recent respects the limit", () => {
  const dbPath = tempDbPath();
  const { code } = commands.pair(dbPath);
  commands.send(code, "one", undefined, dbPath);
  commands.send(code, "two", undefined, dbPath);
  commands.send(code, "three", undefined, dbPath);
  assert.equal(commands.recent(2, dbPath).length, 2);
});
