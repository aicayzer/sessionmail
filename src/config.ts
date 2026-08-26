import { homedir } from "node:os";
import { join } from "node:path";

export function resolveDbPath(explicitPath?: string): string {
  if (explicitPath) return explicitPath;
  if (process.env.SESSIONMAIL_DB) return process.env.SESSIONMAIL_DB;
  const configHome = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
  return join(configHome, "sessionmail", "mailbox.db");
}
