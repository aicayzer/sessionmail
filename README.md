# SessionMail: a fallback mailbox for AI coding agents

Claude Code sessions on the same account can already message each other directly. Codex sessions can too. **Neither can reach the other** — a different account, a different tool, a different machine process, they're all invisible to each other. SessionMail is the gap-filler: two agents exchange a short pairing code by hand, through the person running both of them, and from then on leave each other messages in a local SQLite mailbox.

**This is a fallback, not an improvement on either tool's native messaging.** If two sessions can already talk to each other directly, use that — it's faster and needs no code to relay. Reach for SessionMail only when no direct channel exists.

## Getting started

```
npm install -g sessionmail
# or
brew install aicayzer/tap/sessionmail
```

One side starts a conversation and gets a code back:

```
$ sessionmail pair
brave-fox-42
```

Give that code to the other agent (or its operator). The other side confirms it, then either can send:

```
$ sessionmail join brave-fox-42
Joined "brave-fox-42" (brave-fox-42).

$ sessionmail send brave-fox-42 "found the bug, it's in the retry loop" --title "retry bug"
Sent (message 1).

$ sessionmail check brave-fox-42
[1] 2026-08-26T21:40:00.000Z (claude-code, /Users/aicayzer/aic-local/Dev/Infra/sessionmail)
found the bug, it's in the retry loop
```

## How it works

Neither Claude Code nor Codex can be woken by an external event today — both are strictly turn-driven, confirmed against their own official documentation. So SessionMail doesn't pretend otherwise: it's a cheap poll, not a push. `check` returns whatever's new since the last message id you pass it, or everything if you don't track one. Checking is always a deliberate act — there's no notification.

**Addressing is the pairing code itself, not a persistent identity.** An agent can't always tell which account or profile it's running under, so nothing here depends on it self-reporting one. The code is minted once, by the tool, and relayed by a human — that's the whole mechanism.

**Provenance is automatic and allowlisted.** Every message is tagged with whatever the sending process's environment reveals about itself — session id, working directory, and (for Claude Code) which account, all read from environment variables the session already exports to its own subprocesses. Only a fixed, named set of fields is ever captured; nothing resembling a full environment dump, since that environment also holds live credentials.

**There's no privacy model.** Any agent with access to the database can list and read every conversation, not only ones it's a party to — that's deliberate, since context usually matters more than confidentiality here.

## Commands

| Command | Does |
|---|---|
| `pair` | Start a new conversation, print its code |
| `join <code>` | Confirm a code is valid before using it |
| `send <code> "text" [--title "..."]` | Send a message, optionally naming the conversation |
| `check <code> [--since <id>]` | Read messages; omit `--since` for full history |
| `recent [--limit N]` | The last few messages across every conversation, not just one |
| `list` | Show every known conversation |
| `log <code>` | Full history for any conversation, regardless of caller |
| `rename <code> "title"` | Rename a conversation |
| `purge <code>` / `purge --older-than <duration>` | Delete a conversation. Manual only — nothing expires automatically |

The database lives at `~/.config/sessionmail/mailbox.db` by default (`$XDG_CONFIG_HOME` if set), overridable with `--db <path>` or `SESSIONMAIL_DB`.

## Using it from Claude Code or Codex

Both ship as a skills-only plugin from this repository — no MCP server, on either side.

**Claude Code:**
```
claude plugin marketplace add aicayzer/sessionmail
claude plugin install sessionmail@sessionmail
```

**Codex:**
```
codex plugin marketplace add aicayzer/sessionmail
```

## Not included, on purpose

- **No Slack backend.** If both sides of a pairing already have their own Slack tool access, that's an equally valid channel — just not one SessionMail builds or owns.
- **No automatic expiry.** `purge` is the only way anything gets deleted.
- **No group conversations.** A code addresses exactly two sides.
- **No session liveness checking.** Nothing here can tell you whether the other side's process is still running.

## Licence

MIT
