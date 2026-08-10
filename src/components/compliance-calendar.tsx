"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarIcon, ChevronRightIcon, SyncIcon } from "@/components/icons";
import {
  getComplianceEvents,
  parseLocalDate,
  type CalendarMode,
  type CalendarSnapshot,
  type ComplianceCategory,
  type ComplianceEvent,
} from "@/lib/compliance-calendar";

const categories: readonly ("All" | ComplianceCategory)[] = [
  "All",
  "GST",
  "Direct tax",
  "Payroll",
  "Regulatory update",
];
const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parseLocalDate(value));
}

function syncLabel(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
    timeZoneName: "short",
  }).format(new Date(value));
}

export function ComplianceCalendar({
  initialSnapshot,
  mode,
}: {
  initialSnapshot: CalendarSnapshot | null;
  mode: CalendarMode;
}) {
  const now = new Date();
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [category, setCategory] = useState<(typeof categories)[number]>("All");
  const [snapshot, setSnapshot] = useState<CalendarSnapshot | null>(initialSnapshot);
  const [syncState, setSyncState] = useState<"ready" | "loading" | "error">(
    () => mode === "product" && !initialSnapshot ? "loading" : "ready",
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const year = visibleMonth.getFullYear();
  const monthIndex = visibleMonth.getMonth();
  const visibleCategories = mode === "demo"
    ? categories.filter((item) => item !== "Regulatory update")
    : categories;
  const snapshotMatchesMonth = snapshot?.year === year && snapshot.monthIndex === monthIndex;
  const templateEvents = useMemo(
    () => getComplianceEvents(year, monthIndex),
    [year, monthIndex],
  );
  const fallbackEvents = useMemo(
    () => getComplianceEvents(year, monthIndex, {
      lastVerified: "Availability check pending",
      sourceState: "review",
    }),
    [year, monthIndex],
  );
  const events = mode === "demo"
    ? templateEvents
    : snapshotMatchesMonth
      ? snapshot.events
      : syncState === "error"
        ? fallbackEvents
        : [];
  const filteredEvents = category === "All" ? events : events.filter((event) => event.category === category);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = filteredEvents.find((event) => event.id === selectedId) ?? filteredEvents[0] ?? null;

  useEffect(() => {
    if (mode !== "product") return;
    if (snapshotMatchesMonth && refreshKey === 0) return;

    const controller = new AbortController();

    fetch(`/api/calendar?year=${year}&month=${monthIndex}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Calendar refresh failed");
        return response.json() as Promise<CalendarSnapshot>;
      })
      .then((nextSnapshot) => {
        setSnapshot(nextSnapshot);
        setSelectedId(null);
        setSyncState("ready");
        setRefreshKey(0);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSyncState("error");
        setRefreshKey(0);
      });

    return () => controller.abort();
  }, [mode, monthIndex, refreshKey, snapshotMatchesMonth, year]);

  const firstDay = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const lastDay = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0);
  const leadingDays = (firstDay.getDay() + 6) % 7;
  const cells = Array.from({ length: leadingDays + lastDay.getDate() }, (_, index) => {
    const day = index - leadingDays + 1;
    return day > 0 ? day : null;
  });
  while (cells.length % 7) cells.push(null);

  function moveMonth(offset: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
    setSelectedId(null);
    setSyncState(mode === "product" ? "loading" : "ready");
  }

  function showCurrentMonth() {
    setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedId(null);
    setSyncState(mode === "product" ? "loading" : "ready");
  }

  function eventsForDay(day: number): ComplianceEvent[] {
    return filteredEvents.filter((event) => parseLocalDate(event.date).getDate() === day);
  }

  return (
    <>
      <div className={`calendar-source-notice ${mode === "demo" ? "template" : "live"}`}>
        <div className="calendar-source-copy">
          <span className="calendar-source-badge">
            {mode === "demo"
              ? "Sample calendar"
              : syncState === "loading"
                ? "Refreshing"
                : snapshot?.health === "review" || syncState === "error"
                  ? "Review needed"
                  : "Daily availability check"}
          </span>
          <p>
            {mode === "demo"
              ? "Fixed sample obligations. These dates do not refresh and must not be used for client work."
              : "Monitored source pages are checked for availability daily at 6:00 AM IST. Confirm the current text, extensions, and client applicability before relying."}
          </p>
        </div>
        <div className="calendar-sync-status" aria-live="polite">
          <i className={mode === "demo" ? "template" : syncState === "error" || snapshot?.health === "review" ? "review" : ""} />
          <span>
            <strong>
              {mode === "demo"
                ? "Fixed sample"
                : syncState === "loading"
                  ? "Checking source availability…"
                  : snapshot
                    ? `Checked ${syncLabel(snapshot.checkedAt)}`
                    : "Source check pending"}
            </strong>
            <small>
              {mode === "demo"
                ? "No automatic refresh"
                : snapshot
                  ? `${snapshot.sourcesReachable}/${snapshot.sourceCount} sources reachable`
                  : "Recurring dates remain visible"}
            </small>
          </span>
          {mode === "product" ? (
            <button
              aria-label="Refresh source availability"
              disabled={syncState === "loading"}
              onClick={() => {
                setSyncState("loading");
                setRefreshKey((current) => current + 1);
              }}
              type="button"
            >
              <SyncIcon />
            </button>
          ) : null}
        </div>
      </div>

      <div className="compliance-calendar-shell" aria-busy={syncState === "loading"}>
      <div className="calendar-toolbar">
        <div className="calendar-month-controls">
          <button aria-label="Previous month" className="calendar-arrow" onClick={() => moveMonth(-1)} type="button">
            <ChevronRightIcon />
          </button>
          <h2>{new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(visibleMonth)}</h2>
          <button aria-label="Next month" className="calendar-arrow next" onClick={() => moveMonth(1)} type="button">
            <ChevronRightIcon />
          </button>
          {monthKey(visibleMonth) !== monthKey(now) ? <button className="calendar-today" onClick={showCurrentMonth} type="button">Today</button> : null}
        </div>
        <div className="calendar-filters" aria-label="Filter obligations">
          {visibleCategories.map((item) => (
            <button
              className={category === item ? "active" : ""}
              key={item}
              onClick={() => { setCategory(item); setSelectedId(null); }}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {syncState === "loading" && events.length === 0 ? (
        <div className="calendar-loading" role="status">
          <div>
            {Array.from({ length: 14 }, (_, index) => <span key={index} />)}
          </div>
          <aside><i /><i /><i /><i /></aside>
          <p>Checking source availability and loading this month…</p>
        </div>
      ) : (
        <div className="calendar-workspace">
        <section className="month-grid" aria-label={`${new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(visibleMonth)} calendar`}>
          <div className="weekday-row">
            {weekdayLabels.map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="day-grid">
            {cells.map((day, index) => {
              const dayEvents = day ? eventsForDay(day) : [];
              const isToday = day !== null
                && now.getDate() === day
                && now.getMonth() === visibleMonth.getMonth()
                && now.getFullYear() === visibleMonth.getFullYear();
              return (
                <div className={`calendar-day ${day ? "" : "blank"} ${isToday ? "today" : ""}`} key={`${day ?? "blank"}-${index}`}>
                  {day ? <time>{day}</time> : null}
                  {dayEvents.map((event) => (
                    <button
                      className={`calendar-event ${event.category.toLowerCase().replace(" ", "-")} ${selected?.id === event.id ? "selected" : ""}`}
                      key={event.id}
                      onClick={() => setSelectedId(event.id)}
                      type="button"
                    >
                      <i /> <span>{event.shortTitle}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </section>

        <aside className="calendar-detail" aria-live="polite">
          {selected ? (
            <>
              <div className={`detail-category ${selected.category.toLowerCase().replace(" ", "-")}`}>
                <i /> {selected.category}
              </div>
              <p className="detail-date">{dateLabel(selected.date)}</p>
              <h2>{selected.title}</h2>

              {selected.extension ? (
                <div className="detail-extension">
                  <strong>Extended by notification.</strong>
                  {" "}The statutory date was {dateLabel(selected.extension.originalDate)};
                  {" "}{selected.extension.notification} moved it to {dateLabel(selected.date)}.
                  {selected.extension.limitedTo ? ` This extension is limited to ${selected.extension.limitedTo}.` : ""}
                  {" "}
                  <a href={selected.extension.sourceUrl} rel="noreferrer" target="_blank">Read the notification ↗</a>
                </div>
              ) : null}

              <p className="detail-description">{selected.description}</p>
              <dl>
                <div><dt>Authority</dt><dd>{selected.authority}</dd></div>
                {selected.statutoryBasis ? (
                  <div><dt>Statutory basis</dt><dd>{selected.statutoryBasis}</dd></div>
                ) : null}
                <div><dt>Applies to</dt><dd>{selected.applicability}</dd></div>
                <div><dt>Source page last reached</dt><dd>{selected.lastVerified}<span className="cal-verify-note">This checks that the official page loads. It does not verify the due date, and does not detect a notified extension.</span></dd></div>
                <div><dt>Calendar state</dt><dd>{selected.kind === "regulatory-update" ? "Regulatory effective date" : "Recurring general obligation"} · {selected.sourceState === "checked" ? "source page reachable" : "manual source review needed"}</dd></div>
              </dl>
              <a className="official-source-link" href={selected.sourceUrl} rel="noreferrer" target="_blank">
                <span><small>Official source</small><strong>{selected.sourceLabel}</strong></span>
                <span>↗</span>
              </a>
              <p className="calendar-caveat">
                {selected.extension
                  ? "Confirm the notification still stands, and check for holidays and client-specific rules before filing."
                  : "Reg Mitra does not currently track notified extensions — no extension is recorded for this period, which is not the same as none existing. Check the authority portal for extensions, holidays and client-specific rules before filing."}
              </p>
            </>
          ) : (
            <div className="calendar-empty">
              <CalendarIcon />
              <h2>No obligations in this view</h2>
              <p>Change the category or month to see other source-linked dates.</p>
            </div>
          )}
        </aside>
      </div>
      )}

      <section className="calendar-agenda" aria-label="Month agenda">
        <h2>Month agenda</h2>
        {filteredEvents.map((event) => (
          <button key={event.id} onClick={() => setSelectedId(event.id)} type="button">
            <time>{parseLocalDate(event.date).getDate()}</time>
            <span><strong>{event.title}</strong><small>{event.authority} · {event.category}</small></span>
            <ChevronRightIcon />
          </button>
        ))}
      </section>
    </div>
    </>
  );
}
