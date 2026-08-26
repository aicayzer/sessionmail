---
name: sessionmail
description: Send and check messages with another AI agent session that can't otherwise be reached — a different account, a different tool, a different machine process. Use when you need to hand off context, ask a question, or leave a note for an agent you have no direct channel to.
---

# SessionMail

A local, paired mailbox for exactly the case native session messaging doesn't cover: a different account of the same tool, or a different tool entirely. Claude Code and Codex each already let their own sessions message each other directly — reach for that first if it's available. SessionMail exists only for the gap outside it.

Requires the `sessionmail` CLI on PATH (`npm install -g sessionmail` or `brew install aicayzer/tap/sessionmail`).

## Pairing

Two sides exchange a short code, relayed by the person running both agents:

1. One side runs `sessionmail pair` and reports the printed code to the person running it.
2. The person passes that code to the other agent.
3. The other side runs `sessionmail join <code>` to confirm it's the same conversation.

From then on, both sides address the conversation by that code. There's no other identity system — don't try to register a name or guess which account you're running under.

## Commands

| Command | Does |
|---|---|
| `sessionmail pair` | Start a new conversation, print its code |
| `sessionmail join <code>` | Confirm a code is valid before using it |
| `sessionmail send <code> "text" [--title "..."]` | Send a message, optionally naming the conversation |
| `sessionmail check <code> [--since <id>]` | Read messages; omit `--since` for full history, or pass the last message id you saw for only what's new |
| `sessionmail list` | Show every known conversation |
| `sessionmail log <code>` | Full history for any conversation, even one you weren't part of |
| `sessionmail rename <code> "title"` | Rename a conversation |
| `sessionmail purge <code>` / `purge --older-than <duration>` | Delete a conversation |

## When to check

There's no notification — checking is always a deliberate act. Check:

- Right after joining or resuming a session that has an open pairing.
- Before declaring a task finished, if a paired conversation might affect whether it's actually done.
- Periodically during a long unattended run, if you're expecting a reply.

## What this isn't

This is a fallback, not a replacement for anything either tool already does well. If both sides are sessions of the same account of the same tool, use that tool's own native cross-session messaging instead — it's faster and doesn't need a human to relay a code. Reach for SessionMail only when that direct path doesn't exist: a different account, a different tool, or anything else with no channel of its own.

There's no privacy model — any agent with access to the mailbox can `list` and `log` every conversation, not only ones it's a party to.
