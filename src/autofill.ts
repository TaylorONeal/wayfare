import type { Booking } from "./types.js";
import type { CalendarEvent, CalendarSource, EmailSource } from "./connectors.js";
import { PROVIDERS, parseMessages, dedupe } from "./parsers.js";

export interface AutofillOptions {
  email?: EmailSource;
  calendar?: CalendarSource;
  range?: { from?: string; to?: string };
  /** Extra Gmail-style queries to run in addition to provider hints. */
  extraQueries?: string[];
}

export interface AutofillResult {
  bookings: Booking[];
  /** Per-source counts, handy for a "found N bookings" summary. */
  stats: { emailsScanned: number; parsed: number; deduped: number; calendarEvents: number };
}

/**
 * The "do as little as possible" engine. Given an email source and/or calendar
 * source, pull confirmations, parse them with the provider registry, fold in
 * fixed calendar commitments, and return a deduped Booking[] ready to drop into
 * a Trip.
 *
 * It never mutates anything external and never sends anything — it only reads.
 */
export async function autofillBookings(opts: AutofillOptions): Promise<AutofillResult> {
  const partials: Partial<Booking>[] = [];
  let emailsScanned = 0;
  let calendarEvents = 0;

  if (opts.email) {
    const queries = [...PROVIDERS.flatMap((p) => p.searchHints), ...(opts.extraQueries ?? [])];
    const seen = new Set<string>();
    const all = [];
    for (const q of queries) {
      const msgs = await opts.email.search(q);
      for (const m of msgs) {
        if (seen.has(m.id)) continue;
        seen.add(m.id);
        all.push(m);
      }
    }
    emailsScanned = all.length;
    for (const r of parseMessages(all)) partials.push(r.booking);
  }

  if (opts.calendar) {
    const events = await opts.calendar.listEvents(opts.range);
    calendarEvents = events.length;
    for (const e of events) partials.push(calendarEventToBooking(e));
  }

  const bookings = dedupe(partials);
  // Stable sort by date then title.
  bookings.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "") || a.title.localeCompare(b.title));

  return {
    bookings,
    stats: { emailsScanned, parsed: partials.length, deduped: bookings.length, calendarEvents },
  };
}

function calendarEventToBooking(e: CalendarEvent): Partial<Booking> {
  return {
    title: e.summary,
    date: e.start,
    time: e.startTime,
    endDate: e.end,
    location: e.location,
    notes: e.description,
    status: "confirmed",
    category: "event",
    source: "calendar",
  };
}
