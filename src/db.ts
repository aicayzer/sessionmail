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
      provenance TEXT NOT NULL,
      text TEXT NOT NULL,
      sent_at TEXT NOT NULL
    );
  `);

  cachedDb = db;
  cachedPath = path;
  return db;
}
