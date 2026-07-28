"use client";

import { useMemo, useState } from "react";
import { CalendarIcon, ChevronRightIcon } from "@/components/icons";
import {
  getComplianceEvents,
  parseLocalDate,
  type ComplianceCategory,
  type ComplianceEvent,
} from "@/lib/compliance-calendar";

const categories: readonly ("All" | ComplianceCategory)[] = ["All", "GST", "Direct tax", "Payroll"];
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

export function ComplianceCalendar() {
  const now = new Date();
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [category, setCategory] = useState<(typeof categories)[number]>("All");
  const events = useMemo(
    () => getComplianceEvents(visibleMonth.getFullYear(), visibleMonth.getMonth()),
    [visibleMonth],
  );
  const filteredEvents = category === "All" ? events : events.filter((event) => event.category === category);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = filteredEvents.find((event) => event.id === selectedId) ?? filteredEvents[0] ?? null;

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
  }

  function showCurrentMonth() {
    setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedId(null);
  }

  function eventsForDay(day: number): ComplianceEvent[] {
    return filteredEvents.filter((event) => parseLocalDate(event.date).getDate() === day);
  }

  return (
    <div className="compliance-calendar-shell">
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
          {categories.map((item) => (
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
              <p className="detail-description">{selected.description}</p>
              <dl>
                <div><dt>Authority</dt><dd>{selected.authority}</dd></div>
                <div><dt>Applies to</dt><dd>{selected.applicability}</dd></div>
                <div><dt>Last verified</dt><dd>{selected.lastVerified}</dd></div>
              </dl>
              <a className="official-source-link" href={selected.sourceUrl} rel="noreferrer" target="_blank">
                <span><small>Official source</small><strong>{selected.sourceLabel}</strong></span>
                <span>↗</span>
              </a>
              <p className="calendar-caveat">Check the authority portal for later notifications, extensions, holidays, and client-specific rules before filing.</p>
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
  );
}
