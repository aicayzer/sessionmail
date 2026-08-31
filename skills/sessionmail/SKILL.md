---
name: sessionmail
description: Send and check messages with another AI agent session that can't otherwise be reached — a different account, a different tool, a different machine process. Use when you need to hand off context, ask a question, or leave a note for an agent you have no direct channel to.
---

# SessionMail

A local, paired mailbox for exactly the case native session messaging doesn't cover: a different account of the same tool, or a different tool entirely. Claude Code and Codex each already let their own sessions message each other directly — reach for that first if it's available. SessionMail exists only for the gap outside it.

Requires the `sessionmail` CLI on PATH (`npm install -g sessionmail` or `brew install aicayzer/tap/sessionmail`).

## Pairing

Two sides exchange a short code, relayed by the person running both agents.

**Before generating a code, check whether one already exists to join.** If the user hasn't given you a code and hasn't said they want to start a new conversation, ask which they mean rather than calling `pair` speculatively — an unused code left in the database is harmless but avoidable.

To start a new conversation:

1. Run `sessionmail pair`.
2. Report the code and the join command for the other side, each **on its own line** so they're trivial to copy — for example:

   Pairing code: `stark-sparrow-11`

   `sessionmail join stark-sparrow-11`

3. On macOS, copy the join command to the clipboard silently (`echo "sessionmail join stark-sparrow-11" | pbcopy`) — don't narrate that you did. Skip silently if `pbcopy` isn't available.
4. **If the other side turns out to already have a different code, `sessionmail purge <the-code-you-just-minted>` before proceeding** — don't leave an unused pairing behind.

To join an existing conversation, run `sessionmail join <code>` with the code you were given. **If the conversation is still empty, send a short opener** (e.g. `sessionmail send <code> "joined, ready"`) so the other side has confirmation next time it checks, instead of finding nothing and having to guess whether it worked. Don't send an opener right after `pair` — nobody could have joined yet.

From then on, both sides address the conversation by that code. There's no other identity system — don't try to register a name or guess which account you're running under.

## Commands

| Command | Does |
|---|---|
| `sessionmail pair` | Start a new conversation, print its code |
| `sessionmail join <code>` | Confirm a code is valid before using it |
| `sessionmail send <code> "text" [--title "..."]` | Send a message, optionally naming the conversation |
| `sessionmail send <code> --body-file <path>` | Send a message read from a file, instead of a shell argument |
| `sessionmail check <code> [--since <id>] [--exclude-self] [--wait] [--timeout <seconds>] [--json]` | Read messages — see below |
| `sessionmail recent [--limit N] [--json]` | The last few messages across every conversation, not just one — for "what did the other agent just send" without needing to remember a code |
| `sessionmail list [--json]` | Show every known conversation |
| `sessionmail log <code> [--json]` | Full history for any conversation, even one you weren't part of |
| `sessionmail rename <code> "title"` | Rename a conversation |
| `sessionmail purge <code>` / `purge --older-than <duration>` | Delete a conversation |

Every message shows two numbers: `#N` is its position within that one conversation, and `(id M)` is a global id shared across every conversation on the machine — used only for `--since`. Don't infer anything from the global id changing; use `#N` (or `--exclude-self`) for that.

## When and how to check

There's no notification — checking is always a deliberate act. Check:

- Right after joining or resuming a session that has an open pairing.
- Before declaring a task finished, if a paired conversation might affect whether it's actually done.
- Periodically during a long unattended run, if you're expecting a reply.

**Prefer `check <code> --since <id> --wait` over hand-rolling a sleep loop.** It blocks until a new message arrives or the timeout elapses (default 300s, set with `--timeout`), so you don't need your own `sleep`-and-retry logic. Add `--exclude-self` if you don't want to be woken by your own sends. Add `--json` when parsing output in a script — it's structured and safe to parse, unlike the human-formatted default.

### Watching for the rest of a session (Claude Code)

For a watch that needs to keep firing across a whole session rather than a single wait, wrap a loop of `check --wait` in the Monitor tool, set `persistent: true`, and filter on the parsed JSON rather than raw text — `check` always prints *something* on every call, so a text-line filter risks treating "no new messages" as an event:

```bash
last=<id>
fail=0
while true; do
  if out=$(sessionmail check <code> --since "$last" --wait --timeout 290 --json --exclude-self 2>/dev/null); then
    fail=0
    n=$(jq 'length' <<<"$out")
    if [ "$n" -gt 0 ]; then
      jq -r '.[] | "#\(.seq): \(.text)"' <<<"$out"
      last=$(jq '[.[].id] | max' <<<"$out")
    fi
  else
    fail=$((fail + 1))
    [ "$fail" -ge 3 ] && { echo "sessionmail check failing (${fail}x) — watch may be broken"; fail=0; }
  fi
done
```

Codex has no equivalent — confirmed against `openai/codex` docs and issue tracker; a persistent, agent-callable background-event tool is [an open, unimplemented request](https://github.com/openai/codex/issues/29922). On Codex, use the same `--wait`/`--json` core in a plain loop instead.

## More than two sides

A code isn't access-controlled — nothing stops a third or fourth agent from joining and using the same one, and they'll all see the same messages. That's a side effect of there being no privacy model, not a designed group-chat feature: nothing tracks who's "in" a conversation, so there's no roster and no way to tell how many sides are actually reading it.

## What this isn't

This is a fallback, not a replacement for anything either tool already does well. If both sides are sessions of the same account of the same tool, use that tool's own native cross-session messaging instead — it's faster and doesn't need a human to relay a code. Reach for SessionMail only when that direct path doesn't exist: a different account, a different tool, or anything else with no channel of its own.

There's no privacy model — any agent with access to the mailbox can `list` and `log` every conversation, not only ones it's a party to.
