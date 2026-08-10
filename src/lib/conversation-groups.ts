// Groups a chat list the way every chat product does: Today, Yesterday, then
// receding windows.
//
// A flat list of forty timestamps is not something anyone scans. "The one I had
// on Tuesday about the GST notification" is how people actually look for a past
// conversation, so the list has to be ordered by recency and cut on day
// boundaries the reader recognises.
//
// Boundaries are IST calendar days, not 24-hour windows: a chat at 11pm
// yesterday belongs under "Yesterday" at 9am today, not "Today".

export interface ConversationLike {
  id: string;
  title: string;
  updatedAt: string;
}

export interface ConversationGroup<T> {
  label: string;
  items: T[];
}

function istDayNumber(value: Date): number {
  const iso = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(value);
  return Math.round(Date.parse(`${iso}T00:00:00+05:30`) / 86_400_000);
}

export function groupConversationsByRecency<T extends ConversationLike>(
  conversations: readonly T[],
  now: Date = new Date(),
): ConversationGroup<T>[] {
  const today = istDayNumber(now);

  // Insertion order defines display order, so the newest bucket comes first.
  const buckets = new Map<string, T[]>();
  const push = (label: string, item: T) => {
    const existing = buckets.get(label);
    if (existing) existing.push(item);
    else buckets.set(label, [item]);
  };

  const sorted = [...conversations].sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  );

  for (const conversation of sorted) {
    const when = Date.parse(conversation.updatedAt);
    if (Number.isNaN(when)) {
      // An unreadable timestamp must not vanish from the list.
      push("Earlier", conversation);
      continue;
    }
    const age = today - istDayNumber(new Date(when));
    if (age <= 0) push("Today", conversation);
    else if (age === 1) push("Yesterday", conversation);
    else if (age <= 7) push("Previous 7 days", conversation);
    else if (age <= 30) push("Previous 30 days", conversation);
    else push("Earlier", conversation);
  }

  return [...buckets].map(([label, items]) => ({ label, items }));
}
