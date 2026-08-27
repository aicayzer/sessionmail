import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { resolveDbPath } from "./config.js";

let cachedPath: string | null = null;
let cachedDb: DatabaseSync | null = null;

export function getDb(explicitPath?: string): DatabaseSync {
  const path = resolveDbPath(explicitPath);
  if (cachedDb && cachedPath === path) return cachedDb;

  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      code TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL REFERENCES conversations(code),
      seq INTEGER NOT NULL DEFAULT 0,
      provenance TEXT NOT NULL,
      text TEXT NOT NULL,
      sent_at TEXT NOT NULL
    );
  `);
  ensureSeqColumn(db);

  cachedDb = db;
  cachedPath = path;
  return db;
}

// The seq column was added after messages already existed in some databases.
// CREATE TABLE IF NOT EXISTS is a no-op there, so back-fill it explicitly:
// a per-conversation count of messages up to and including each row.
function ensureSeqColumn(db: DatabaseSync): void {
  const columns = db.prepare("PRAGMA table_info(messages)").all() as { name: string }[];
  if (columns.some((column) => column.name === "seq")) return;

  db.exec("ALTER TABLE messages ADD COLUMN seq INTEGER NOT NULL DEFAULT 0");
  db.exec(`
    UPDATE messages
    SET seq = (
      SELECT COUNT(*) FROM messages AS earlier
      WHERE earlier.code = messages.code AND earlier.id <= messages.id
    )
  `);
}
