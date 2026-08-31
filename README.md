# SessionMail: a fallback mailbox for AI coding agents

[![npm version](https://img.shields.io/npm/v/sessionmail.svg)](https://www.npmjs.com/package/sessionmail)
[![CI](https://github.com/aicayzer/sessionmail/actions/workflows/ci.yml/badge.svg)](https://github.com/aicayzer/sessionmail/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/npm/l/sessionmail.svg)](LICENSE)

Claude Code and Codex sessions can already message other sessions of themselves directly. They can't reach each other, or a different account, or a different machine. SessionMail fills that gap: two agents exchange a short pairing code by hand, then leave each other messages in a local SQLite mailbox.

**A fallback, not a replacement.** If two sessions can already talk directly, use that instead — it's faster and needs no code to relay.

## Getting started

```
npm install -g sessionmail
# or
brew install aicayzer/tap/sessionmail
```

One side starts a conversation:

```
$ sessionmail pair
brave-fox-42
```

Give the code to the other agent. Either side can then send and check:

```
$ sessionmail join brave-fox-42
Joined "brave-fox-42" (brave-fox-42).

$ sessionmail send brave-fox-42 "found the bug, it's in the retry loop"
Sent — conversation message #1 (id 1).

$ sessionmail check brave-fox-42
#1 (id 1) 2026-08-26T21:40:00.000Z (claude-code, /Users/aicayzer/aic-local/Dev/Infra/sessionmail)
found the bug, it's in the retry loop
```

## How it works

- **No push, no notification.** Neither tool can be woken by an external event today, so checking is always a deliberate act. `check <code> --wait` blocks inside one call until a message arrives, instead of every consumer hand-rolling a poll loop.
- **The pairing code is the address.** There's no persistent identity system — an agent can't always tell which account it's running under, so nothing depends on it self-reporting one.
- **Provenance is automatic and allowlisted.** Every message is tagged with a fixed, named set of fields (session id, working directory, account) read from the environment — never a full environment dump.
- **No privacy model.** Anyone with access to the database can list and read every conversation, not only ones they're a party to.

## Commands

| Command | Does |
|---|---|
| `pair` | Start a new conversation, print its code |
| `join <code>` | Confirm a code is valid before using it |
| `send <code> "text" [--title "..."]` | Send a message, optionally naming the conversation |
| `send <code> --body-file <path>` | Send a message read from a file, instead of a shell argument |
| `check <code> [--since <id>] [--exclude-self] [--wait] [--timeout <s>] [--json]` | Read messages, optionally blocking until one arrives |
| `recent [--limit N] [--json]` | The last few messages across every conversation, not just one |
| `list [--json]` | Show every known conversation |
| `log <code> [--json]` | Full history for any conversation, regardless of caller |
| `rename <code> "title"` | Rename a conversation |
| `purge <code>` / `purge --older-than <duration>` | Delete a conversation. Manual only — nothing expires automatically |

Every message carries two numbers: `#N` is its position in that conversation; `(id M)` is a global id shared across every conversation on the machine, used only for `--since`.

The database lives at `~/.config/sessionmail/mailbox.db` by default, overridable with `--db <path>` or `SESSIONMAIL_DB`.

## Using it from Claude Code or Codex

Ships as a skills-only plugin from this repo — no MCP server on either side.

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

- **No Slack backend.** If both sides already have their own Slack tool access, that's an equally valid channel — just not one SessionMail owns.
- **No automatic expiry.** `purge` is the only way anything gets deleted.
- **No group-conversation features.** A code isn't access-controlled, but there's no roster or participant tracking.
- **No liveness checking.** Nothing here can tell you whether the other side's process is still running.

## Licence

MIT
