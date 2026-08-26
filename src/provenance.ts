import { hostname } from "node:os";
import { join } from "node:path";

export interface Provenance {
  provider: "codex" | "claude-code" | "unknown";
  cwd: string;
  hostname: string;
  pid: number;
  timestamp: string;
  sessionId?: string;
  threadId?: string;
  account?: string;
  claudePid?: string;
  transcriptPath?: string;
}

// Allowlist only. The environment a session runs in is dense with live
// secrets, including a Claude Code session's own messaging-socket auth
// token — never widen this to a blanket process.env dump.
export function captureProvenance(): Provenance {
  const cwd = process.cwd();
  const base = {
    cwd,
    hostname: hostname(),
    pid: process.pid,
    timestamp: new Date().toISOString(),
  };

  const codexSessionId = process.env.CODEX_SESSION_ID;
  if (codexSessionId) {
    return {
      ...base,
      provider: "codex",
      sessionId: codexSessionId,
      threadId: process.env.CODEX_THREAD_ID,
    };
  }

  const claudeSessionId = process.env.CLAUDE_CODE_SESSION_ID;
  if (claudeSessionId) {
    const configDir = process.env.CLAUDE_CONFIG_DIR;
    const escapedCwd = cwd.replace(/\//g, "-");
    return {
      ...base,
      provider: "claude-code",
      sessionId: claudeSessionId,
      account: configDir,
      claudePid: process.env.CLAUDE_PID,
      transcriptPath: configDir
        ? join(configDir, "projects", escapedCwd, `${claudeSessionId}.jsonl`)
        : undefined,
    };
  }

  return { ...base, provider: "unknown" };
}
