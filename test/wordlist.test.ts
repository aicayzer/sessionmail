import { test } from "node:test";
import assert from "node:assert/strict";
import { generateCode } from "../src/wordlist.js";

test("generates a code matching word-word-number", () => {
  const code = generateCode(() => false);
  assert.match(code, /^[a-z]+-[a-z]+-\d+$/);
});

test("retries when a candidate code already exists", () => {
  let calls = 0;
  const code = generateCode(() => {
    calls += 1;
    return calls < 3;
  });
  assert.match(code, /^[a-z]+-[a-z]+-\d+$/);
  assert.equal(calls, 3);
});

test("throws after too many collisions", () => {
  assert.throws(() => generateCode(() => true));
});
