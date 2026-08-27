import { getDb } from "./db.js";
import { captureProvenance } from "./provenance.js";
import { generateCode } from "./wordlist.js";

export interface Conversation {
  code: string;
  title: string;
  created_at: string;
}

export interface ConversationSummary extends Conversation {
  last_activity: string | null;
}

export interface MessageRow {
  id: number;
  code: string;
  seq: number;
  provenance: string;
  text: string;
  sent_at: string;
}

export function pair(dbPath?: string): Conversation {
  const db = getDb(dbPath);
  const exists = (code: string) =>
    !!db.prepare("SELECT 1 FROM conversations WHERE code = ?").get(code);
  const code = generateCode(exists);
  const created_at = new Date().toISOString();
  db.prepare(
    "INSERT INTO conversations (code, title, created_at) VALUES (?, ?, ?)"
  ).run(code, code, created_at);
  return { code, title: code, created_at };
}

export function join(code: string, dbPath?: string): Conversation {
  const db = getDb(dbPath);
  const row = db
    .prepare("SELECT code, title, created_at FROM conversations WHERE code = ?")
    .get(code) as Conversation | undefined;
  if (!row) {
    throw new Error(
      `No conversation found for code "${code}". Ask the other side for the exact code, or run "pair" to start a new one.`
    );
  }
  return row;
}

export function send(
  code: string,
  text: string,
  title: string | undefined,
  dbPath?: string
): { id: number; seq: number } {
  if (text.trim().length === 0) {
    throw new Error(
      "Message body is empty. Refusing to send — pass real text, or use --body-file to read it from a file."
    );
  }
  const db = getDb(dbPath);
  const convo = db.prepare("SELECT code FROM conversations WHERE code = ?").get(code);
  if (!convo) {
    throw new Error(
      `No conversation found for code "${code}". Run "join <code>" first, or "pair" to start a new one.`
    );
  }
  if (title) {
    db.prepare("UPDATE conversations SET title = ? WHERE code = ?").run(title, code);
  }
  const provenance = JSON.stringify(captureProvenance());
  const sent_at = new Date().toISOString();
  const { maxSeq } = db
    .prepare("SELECT COALESCE(MAX(seq), 0) AS maxSeq FROM messages WHERE code = ?")
    .get(code) as { maxSeq: number };
  const seq = maxSeq + 1;
  const result = db
    .prepare("INSERT INTO messages (code, seq, provenance, text, sent_at) VALUES (?, ?, ?, ?, ?)")
    .run(code, seq, provenance, text, sent_at);
  return { id: Number(result.lastInsertRowid), seq };
}

export function check(
  code: string,
  since: number | undefined,
  excludeSelf: boolean,
  dbPath?: string
): MessageRow[] {
  const db = getDb(dbPath);
  const rows = (
    since !== undefined
      ? db
          .prepare("SELECT * FROM messages WHERE code = ? AND id > ? ORDER BY id ASC")
          .all(code, since)
      : db.prepare("SELECT * FROM messages WHERE code = ? ORDER BY id ASC").all(code)
  ) as unknown as MessageRow[];

  if (!excludeSelf) return rows;

  const ownSessionId = (captureProvenance() as { sessionId?: string }).sessionId;
  if (!ownSessionId) return rows;

  return rows.filter((row) => {
    const provenance = JSON.parse(row.provenance) as { sessionId?: string };
    return provenance.sessionId !== ownSessionId;
  });
}

export function log(code: string, dbPath?: string): MessageRow[] {
  return check(code, undefined, false, dbPath);
}

export interface RecentMessageRow extends MessageRow {
  title: string;
}

export function recent(limit: number, dbPath?: string): RecentMessageRow[] {
  const db = getDb(dbPath);
  return db
    .prepare(
      `SELECT m.id, m.code, m.provenance, m.text, m.sent_at, c.title
       FROM messages m
       JOIN conversations c ON c.code = m.code
       ORDER BY m.id DESC
       LIMIT ?`
    )
    .all(limit) as unknown as RecentMessageRow[];
}

export function list(dbPath?: string): ConversationSummary[] {
  const db = getDb(dbPath);
  return db
    .prepare(
      `SELECT c.code, c.title, c.created_at,
              (SELECT MAX(sent_at) FROM messages m WHERE m.code = c.code) AS last_activity
       FROM conversations c
       ORDER BY last_activity DESC, c.created_at DESC`
    )
    .all() as unknown as ConversationSummary[];
}

export function rename(code: string, title: string, dbPath?: string): void {
  const db = getDb(dbPath);
  const result = db
    .prepare("UPDATE conversations SET title = ? WHERE code = ?")
    .run(title, code);
  if (result.changes === 0) {
    throw new Error(`No conversation found for code "${code}".`);
  }
}

export interface PurgeResult {
  deletedConversations: number;
  deletedMessages: number;
}

export function purge(
  code: string | undefined,
  olderThan: string | undefined,
  dbPath?: string
): PurgeResult {
  const db = getDb(dbPath);

  if (code) {
    const messages = db.prepare("DELETE FROM messages WHERE code = ?").run(code);
    const conversations = db.prepare("DELETE FROM conversations WHERE code = ?").run(code);
    return {
      deletedConversations: Number(conversations.changes),
      deletedMessages: Number(messages.changes),
    };
  }

  if (olderThan) {
    const cutoff = parseDuration(olderThan);
    const messages = db
      .prepare(
        "DELETE FROM messages WHERE code IN (SELECT code FROM conversations WHERE created_at < ?)"
      )
      .run(cutoff);
    const conversations = db
      .prepare("DELETE FROM conversations WHERE created_at < ?")
      .run(cutoff);
    return {
      deletedConversations: Number(conversations.changes),
      deletedMessages: Number(messages.changes),
    };
  }

  throw new Error("purge requires either a code or --older-than <duration>");
}

const DURATION_UNITS_MS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
};

function parseDuration(input: string): string {
  const match = input.match(/^(\d+)([smhdw])$/);
  if (!match) {
    throw new Error(`Invalid duration "${input}". Use a number followed by s/m/h/d/w, e.g. "30d".`);
  }
  const value = Number(match[1]);
  const unitMs = DURATION_UNITS_MS[match[2]];
  return new Date(Date.now() - value * unitMs).toISOString();
}
