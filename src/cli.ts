#!/usr/bin/env node
import { Command } from "commander";
import * as commands from "./commands.js";

const program = new Command();

program
  .name("sessionmail")
  .description("A local, paired mailbox for AI coding agents that can't otherwise reach each other.")
  .version("0.1.0")
  .option("--db <path>", "override the mailbox database path");

function dbPath(): string | undefined {
  return program.opts().db;
}

program
  .command("pair")
  .description("Start a new conversation and print its pairing code")
  .action(() => {
    const convo = commands.pair(dbPath());
    console.log(convo.code);
  });

program
  .command("join <code>")
  .description("Confirm a pairing code is valid before using it")
  .action((code: string) => {
    const convo = commands.join(code, dbPath());
    console.log(`Joined "${convo.title}" (${convo.code}).`);
  });

program
  .command("send <code> <text>")
  .description("Send a message in a conversation")
  .option("--title <title>", "rename the conversation")
  .action((code: string, text: string, opts: { title?: string }) => {
    const result = commands.send(code, text, opts.title, dbPath());
    console.log(`Sent (message ${result.id}).`);
  });

program
  .command("check <code>")
  .description("Show messages since --since, or all messages if omitted")
  .option("--since <id>", "only messages after this message id")
  .action((code: string, opts: { since?: string }) => {
    const since = opts.since !== undefined ? Number(opts.since) : undefined;
    printMessages(commands.check(code, since, dbPath()));
  });

program
  .command("log <code>")
  .description("Show full history for a conversation, regardless of caller")
  .action((code: string) => {
    printMessages(commands.log(code, dbPath()));
  });

program
  .command("recent")
  .description("Show the most recent messages across every conversation")
  .option("--limit <n>", "how many messages to show", "10")
  .action((opts: { limit: string }) => {
    const messages = commands.recent(Number(opts.limit), dbPath()).reverse();
    printRecentMessages(messages);
  });

program
  .command("list")
  .description("List every known conversation")
  .action(() => {
    printConversations(commands.list(dbPath()));
  });

program
  .command("rename <code> <title>")
  .description("Rename a conversation")
  .action((code: string, title: string) => {
    commands.rename(code, title, dbPath());
    console.log("Renamed.");
  });

program
  .command("purge [code]")
  .description("Delete one conversation, or use --older-than for a bulk purge")
  .option("--older-than <duration>", 'delete conversations older than this, e.g. "30d"')
  .action((code: string | undefined, opts: { olderThan?: string }) => {
    const result = commands.purge(code, opts.olderThan, dbPath());
    console.log(
      `Deleted ${result.deletedConversations} conversation(s), ${result.deletedMessages} message(s).`
    );
  });

program.parseAsync().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

function printMessages(messages: commands.MessageRow[]): void {
  if (messages.length === 0) {
    console.log("No messages.");
    return;
  }
  for (const message of messages) {
    const provenance = JSON.parse(message.provenance) as { provider: string; cwd?: string };
    const context = provenance.cwd ? `${provenance.provider}, ${provenance.cwd}` : provenance.provider;
    console.log(`[${message.id}] ${message.sent_at} (${context})`);
    console.log(message.text);
    console.log("");
  }
}

function printRecentMessages(messages: commands.RecentMessageRow[]): void {
  if (messages.length === 0) {
    console.log("No messages.");
    return;
  }
  for (const message of messages) {
    const provenance = JSON.parse(message.provenance) as { provider: string; cwd?: string };
    const context = provenance.cwd ? `${provenance.provider}, ${provenance.cwd}` : provenance.provider;
    console.log(`[${message.code}] ${message.sent_at} (${context}) — "${message.title}"`);
    console.log(message.text);
    console.log("");
  }
}

function printConversations(conversations: commands.ConversationSummary[]): void {
  if (conversations.length === 0) {
    console.log("No conversations.");
    return;
  }
  for (const convo of conversations) {
    const lastActivity = convo.last_activity ?? convo.created_at;
    console.log(`${convo.code}\t${convo.title}\t${lastActivity}`);
  }
}
