import { test } from "node:test";
import assert from "node:assert/strict";
import { captureProvenance } from "../src/provenance.js";

const TRACKED_VARS = [
  "CODEX_SESSION_ID",
  "CODEX_THREAD_ID",
  "CLAUDE_CODE_SESSION_ID",
  "CLAUDE_CONFIG_DIR",
  "CLAUDE_PID",
  "CLAUDE_CODE_MESSAGING_TOKEN",
];

function withEnv(overrides: Record<string, string>, fn: () => void): void {
  const saved: Record<string, string | undefined> = {};
  for (const key of TRACKED_VARS) saved[key] = process.env[key];
  for (const key of TRACKED_VARS) delete process.env[key];
  Object.assign(process.env, overrides);
  try {
    fn();
  } finally {
    for (const key of TRACKED_VARS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

test("falls back to an unknown provider with no recognised env vars", () => {
  withEnv({}, () => {
    const provenance = captureProvenance();
    assert.equal(provenance.provider, "unknown");
    assert.ok(provenance.cwd);
    assert.ok(provenance.timestamp);
  });
});

test("detects codex from CODEX_SESSION_ID", () => {
  withEnv({ CODEX_SESSION_ID: "test-session-id", CODEX_THREAD_ID: "test-thread-id" }, () => {
    const provenance = captureProvenance();
    assert.equal(provenance.provider, "codex");
    assert.equal(provenance.sessionId, "test-session-id");
    assert.equal(provenance.threadId, "test-thread-id");
  });
});

test("detects claude-code and constructs the transcript path", () => {
  withEnv(
    { CLAUDE_CODE_SESSION_ID: "abc-123", CLAUDE_CONFIG_DIR: "/Users/test/.claude" },
    () => {
      const provenance = captureProvenance();
      assert.equal(provenance.provider, "claude-code");
      const expectedCwd = provenance.cwd.replace(/\//g, "-");
      assert.equal(
        provenance.transcriptPath,
        `/Users/test/.claude/projects/${expectedCwd}/abc-123.jsonl`
      );
    }
  );
});

test("never captures CLAUDE_CODE_MESSAGING_TOKEN even when it's set", () => {
  withEnv(
    { CLAUDE_CODE_SESSION_ID: "abc-123", CLAUDE_CODE_MESSAGING_TOKEN: "super-secret-token" },
    () => {
      const provenance = captureProvenance();
      const serialized = JSON.stringify(provenance);
      assert.ok(!serialized.includes("super-secret-token"));
    }
  );
});
