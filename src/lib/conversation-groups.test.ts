import assert from "node:assert/strict";
import test from "node:test";
import { groupConversationsByRecency } from "./conversation-groups.ts";

const now = new Date("2026-08-06T12:00:00+05:30");

const at = (id: string, iso: string) => ({ id, title: id, updatedAt: iso });

test("groups fall into the buckets a reader expects, newest first", () => {
  const groups = groupConversationsByRecency([
    at("today", "2026-08-06T09:00:00+05:30"),
    at("yesterday", "2026-08-05T09:00:00+05:30"),
    at("thisWeek", "2026-08-02T09:00:00+05:30"),
    at("thisMonth", "2026-07-20T09:00:00+05:30"),
    at("ancient", "2026-05-01T09:00:00+05:30"),
  ], now);

  assert.deepEqual(groups.map((g) => g.label), [
    "Today", "Yesterday", "Previous 7 days", "Previous 30 days", "Earlier",
  ]);
});

test("late last night is Yesterday, not Today", () => {
  // The bug a 24-hour window would produce: 23:30 yesterday is 12.5 hours ago
  // at midday, so a rolling window would file it under Today.
  const groups = groupConversationsByRecency([at("late", "2026-08-05T23:30:00+05:30")], now);
  assert.equal(groups[0]!.label, "Yesterday");
});

test("just after midnight IST is Today", () => {
  const groups = groupConversationsByRecency([at("early", "2026-08-06T00:15:00+05:30")], now);
  assert.equal(groups[0]!.label, "Today");
});

test("within a group, the most recent chat is first", () => {
  const groups = groupConversationsByRecency([
    at("older", "2026-08-06T08:00:00+05:30"),
    at("newer", "2026-08-06T11:00:00+05:30"),
  ], now);
  assert.deepEqual(groups[0]!.items.map((i) => i.id), ["newer", "older"]);
});

test("empty history produces no groups rather than empty headings", () => {
  assert.deepEqual(groupConversationsByRecency([], now), []);
});

test("an unreadable timestamp is kept, not dropped", () => {
  // Losing a conversation silently is worse than filing it imprecisely.
  const groups = groupConversationsByRecency([at("broken", "not-a-date")], now);
  assert.equal(groups.length, 1);
  assert.equal(groups[0]!.items[0]!.id, "broken");
});

test("only the buckets that have chats appear", () => {
  const groups = groupConversationsByRecency([at("t", "2026-08-06T09:00:00+05:30")], now);
  assert.deepEqual(groups.map((g) => g.label), ["Today"]);
});
