/**
 * Connectors are pluggable data sources. The renderer never talks to Gmail or a
 * calendar directly — it consumes plain Booking objects. Anything that can
 * produce EmailMessage / CalendarEvent records can feed the autofill pipeline.
 *
 * Three intended implementations:
 *   1. Claude MCP-backed (the Agent Skill passes connector results in) — see skill/wayfare.
 *   2. Local files: .ics export, or .eml / JSON message dumps (works offline, used in tests).
 *   3. Direct OAuth (Gmail API, Google/Microsoft Calendar) — documented extension, not bundled,
 *      so the core package ships with zero runtime dependencies and no secrets handling.
 */

export interface EmailMessage {
  id: string;
  from: string; // full From header, e.g. "Acme <no-reply@acme.com>"
  subject: string;
  date?: string; // ISO date if known
  body: string; // plain-text body
}

export interface CalendarEvent {
  uid: string;
  summary: string;
  start?: string; // ISO date (YYYY-MM-DD)
  startTime?: string; // HH:MM local, if timed
  end?: string;
  location?: string;
  description?: string;
}

/** A source of confirmation emails. */
export interface EmailSource {
  /**
   * Return messages matching a query. Query semantics are source-specific;
   * Gmail-style `from:` / `subject:` strings are recommended. A source may
   * ignore the query and return everything it has (then the parsers filter).
   */
  search(query: string): Promise<EmailMessage[]>;
}

/** A source of fixed calendar commitments. */
export interface CalendarSource {
  listEvents(range?: { from?: string; to?: string }): Promise<CalendarEvent[]>;
}

/* --------------------- in-memory / fixture sources ------------------ */

export class StaticEmailSource implements EmailSource {
  constructor(private messages: EmailMessage[]) {}
  async search(): Promise<EmailMessage[]> {
    return this.messages;
  }
}

export class StaticCalendarSource implements CalendarSource {
  constructor(private events: CalendarEvent[]) {}
  async listEvents(): Promise<CalendarEvent[]> {
    return this.events;
  }
}

/* ----------------------------- ICS parser --------------------------- */

/**
 * Minimal RFC 5545 VEVENT parser. Handles line unfolding, DATE / DATE-TIME
 * values, and the common fields. No external dependencies. Good enough to turn
 * an exported calendar (.ics) into CalendarEvents for autofill.
 */
export function parseICS(ics: string): CalendarEvent[] {
  // Unfold folded lines (continuation lines start with a space or tab).
  const unfolded = ics.replace(/\r?\n[ \t]/g, "");
  const lines = unfolded.split(/\r?\n/);
  const events: CalendarEvent[] = [];
  let cur: Partial<CalendarEvent> | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      cur = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (cur && (cur.summary || cur.uid)) {
        events.push({
          uid: cur.uid ?? `evt-${events.length}`,
          summary: cur.summary ?? "(untitled)",
          start: cur.start,
          startTime: cur.startTime,
          end: cur.end,
          location: cur.location,
          description: cur.description,
        });
      }
      cur = null;
      continue;
    }
    if (!cur) continue;

    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const rawKey = line.slice(0, idx);
    const value = line.slice(idx + 1);
    const key = rawKey.split(";")[0];

    switch (key) {
      case "UID":
        cur.uid = value;
        break;
      case "SUMMARY":
        cur.summary = unescapeICS(value);
        break;
      case "LOCATION":
        cur.location = unescapeICS(value);
        break;
      case "DESCRIPTION":
        cur.description = unescapeICS(value);
        break;
      case "DTSTART": {
        const d = parseICSDate(value);
        cur.start = d.date;
        if (d.time) cur.startTime = d.time;
        break;
      }
      case "DTEND": {
        const d = parseICSDate(value);
        cur.end = d.date;
        break;
      }
      default:
        break;
    }
  }
  return events;
}

function unescapeICS(s: string): string {
  return s.replace(/\\n/gi, " ").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

function parseICSDate(v: string): { date?: string; time?: string } {
  // Forms: 20260730  | 20260730T133000Z | 20260730T133000
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})Z?)?/.exec(v);
  if (!m) return {};
  const date = `${m[1]}-${m[2]}-${m[3]}`;
  if (m[4]) return { date, time: `${m[4]}:${m[5]}` };
  return { date };
}
