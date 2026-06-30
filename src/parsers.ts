import type { Booking, BookingCategory } from "./types.js";
import type { EmailMessage } from "./connectors.js";

/**
 * Travel providers, like yoga studios, use a small number of booking platforms.
 * Each has a stable sender domain and recognizable subject/body patterns. The
 * highest-precision filter is the sender domain; subject is second; body third.
 *
 * A Provider knows how to (a) recognize its emails and (b) pull a partial
 * Booking out of them. Parsers are deliberately conservative: they return what
 * they can read and leave the rest undefined, so dedupe/merge can combine
 * multiple emails (confirmation + reminder) into one record.
 *
 * Add a provider by pushing to PROVIDERS. Keep regexes resilient — email
 * layouts change; match on stable anchors (labels, currency symbols, codes).
 */
export interface Provider {
  name: string;
  category: BookingCategory;
  /** Gmail-style search hints the Skill/connector can use to fetch candidates. */
  searchHints: string[];
  match(m: EmailMessage): boolean;
  parse(m: EmailMessage): Partial<Booking>;
}

const senderHas = (m: EmailMessage, domain: string) =>
  m.from.toLowerCase().includes(domain.toLowerCase());

const firstMatch = (s: string, re: RegExp): string | undefined => {
  const r = re.exec(s);
  return r?.[1]?.trim();
};

/** Find a confirmation/booking code near common labels. */
function findConfirmation(text: string): string | undefined {
  return firstMatch(
    text,
    /(?:confirmation(?:\s*(?:code|number|#|no\.?))?|booking\s*(?:code|number|ref(?:erence)?|id)|itinerary|PNR|reference)\s*[:#]?\s*([A-Z0-9]{5,10})\b/i,
  );
}

function findMoney(text: string): { amount: number; currency: string } | undefined {
  // $1,234.56 / USD 1234 / IDR 7,579,000
  const sym = /([$£€])\s?([\d,]+(?:\.\d{2})?)/.exec(text);
  if (sym) {
    const cur = { "$": "USD", "£": "GBP", "€": "EUR" }[sym[1]!]!;
    return { amount: Number(sym[2]!.replace(/,/g, "")), currency: cur };
  }
  const iso = /\b([A-Z]{3})\s?([\d,]+(?:\.\d{2})?)\b/.exec(text);
  if (iso) return { amount: Number(iso[2]!.replace(/,/g, "")), currency: iso[1]! };
  return undefined;
}

export const PROVIDERS: Provider[] = [
  {
    name: "Airbnb",
    category: "lodging",
    searchHints: ["from:airbnb.com (reservation OR confirmed)", "from:automated@airbnb.com"],
    match: (m) => senderHas(m, "airbnb.com"),
    parse: (m) => ({
      category: "lodging",
      status: "confirmed",
      title: firstMatch(m.subject, /Reservation confirmed.*?(?:for|at)\s+(.+)$/i) ?? m.subject.replace(/^.*?:\s*/, ""),
      confirmation: firstMatch(m.body, /Confirmation code\s*[:\n]\s*([A-Z0-9]{6,10})/i) ?? findConfirmation(m.body),
      location: firstMatch(m.body, /(?:Address|Location)\s*[:\n]\s*(.+)/i),
      cost: findMoney(m.body),
    }),
  },
  {
    name: "Booking.com",
    category: "lodging",
    searchHints: ["from:booking.com confirmed", "from:bstatic.com"],
    match: (m) => senderHas(m, "booking.com"),
    parse: (m) => ({
      category: "lodging",
      status: "confirmed",
      title: firstMatch(m.subject, /confirmed:\s*(.+?)(?:\s*\(|$)/i) ?? m.subject,
      confirmation: firstMatch(m.body, /Confirmation number\s*[:\n]\s*([\d]{8,12})/i) ?? findConfirmation(m.body),
      cost: findMoney(m.body),
    }),
  },
  {
    name: "Expedia / Hotels.com",
    category: "lodging",
    searchHints: ["from:expedia.com itinerary", "from:hotels.com confirmation"],
    match: (m) => senderHas(m, "expedia.") || senderHas(m, "hotels.com"),
    parse: (m) => ({
      category: "lodging",
      status: "confirmed",
      title: m.subject.replace(/^.*?(?:itinerary|confirmation)[:\s-]*/i, "").trim() || m.subject,
      confirmation: findConfirmation(m.body),
      cost: findMoney(m.body),
    }),
  },
  {
    name: "Airline (generic)",
    category: "flight",
    searchHints: [
      "subject:(flight confirmation OR e-ticket OR itinerary)",
      "from:(delta.com OR united.com OR aa.com OR singaporeair.com OR qantas.com)",
    ],
    match: (m) =>
      /\b(flight|e-?ticket|itinerary|boarding|PNR)\b/i.test(m.subject) &&
      /\b([A-Z]{2}\s?\d{2,4})\b/.test(m.body),
    parse: (m) => ({
      category: "flight",
      status: "confirmed",
      title: firstMatch(m.body, /([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s*(?:to|–|-|→)\s*([A-Z][a-z]+)/) ? m.subject : m.subject,
      confirmation: firstMatch(m.body, /(?:PNR|record locator|confirmation)\s*[:#]?\s*([A-Z0-9]{6})\b/i) ?? findConfirmation(m.body),
      time: firstMatch(m.body, /\b(\d{1,2}:\d{2}\s?(?:AM|PM)?)\b/i),
      cost: findMoney(m.body),
    }),
  },
  {
    name: "Viator",
    category: "activity",
    searchHints: ["from:viator.com (booking OR confirmed)"],
    match: (m) => senderHas(m, "viator.com"),
    parse: (m) => ({
      category: "activity",
      status: "confirmed",
      title: firstMatch(m.subject, /(?:your booking(?:\s+is)?\s+confirmed|booking confirmed|your booking)[:\s-]*(.+)$/i) ?? m.subject,
      confirmation: findConfirmation(m.body),
      cost: findMoney(m.body),
    }),
  },
  {
    name: "GetYourGuide",
    category: "activity",
    searchHints: ["from:getyourguide.com booking"],
    match: (m) => senderHas(m, "getyourguide."),
    parse: (m) => ({
      category: "activity",
      status: "confirmed",
      title: firstMatch(m.subject, /booking.*?:\s*(.+)$/i) ?? m.subject,
      confirmation: findConfirmation(m.body),
      cost: findMoney(m.body),
    }),
  },
  {
    name: "Car rental (generic)",
    category: "transport",
    searchHints: ["subject:(car rental OR reservation) from:(hertz.com OR avis.com OR enterprise.com OR sixt.com)"],
    match: (m) => /\b(car rental|rental confirmation|pick-?up location)\b/i.test(m.subject + " " + m.body),
    parse: (m) => ({
      category: "transport",
      status: "confirmed",
      title: m.subject,
      confirmation: findConfirmation(m.body),
      location: firstMatch(m.body, /Pick-?up(?:\s*location)?\s*[:\n]\s*(.+)/i),
      cost: findMoney(m.body),
    }),
  },
  {
    name: "Stripe / PayPal receipt",
    category: "other",
    searchHints: ["from:stripe.com receipt", "from:paypal.com receipt"],
    match: (m) => senderHas(m, "stripe.com") || senderHas(m, "paypal.com"),
    parse: (m) => ({
      category: "other",
      status: "reserved", // a payment receipt usually means a deposit/hold, verify
      title: firstMatch(m.subject, /Receipt (?:from|for(?:\s*your\s*payment\s*to)?)\s+(.+?)(?:\s*[-–]|$)/i) ?? m.subject,
      cost: findMoney(m.body),
      source: "payment receipt — verify against provider",
    }),
  },
];

export interface ParseResult {
  booking: Partial<Booking>;
  provider: string;
  messageId: string;
}

/** Run all providers over a batch of messages. */
export function parseMessages(messages: EmailMessage[]): ParseResult[] {
  const out: ParseResult[] = [];
  for (const m of messages) {
    for (const p of PROVIDERS) {
      if (!p.match(m)) continue;
      const partial = p.parse(m);
      out.push({
        // NOTE: the email's received date is deliberately NOT used as the
        // booking date — they are usually different. Date comes from the parsed
        // body (if a provider extracts it) or from a matching calendar event.
        booking: { source: p.name, ...partial },
        provider: p.name,
        messageId: m.id,
      });
      break; // first matching provider wins
    }
  }
  return out;
}

/* ------------------------------- dedupe ----------------------------- */

function keyOf(b: Partial<Booking>): string {
  // Group primarily by title. A booking surfaces across several emails
  // (confirmation + reminders) and often a matching calendar event, each with a
  // different or missing date — so title is the stable join key. When a date is
  // present on both sides it is preserved during merge, just not used to split.
  const norm = (s?: string) => (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 28);
  return norm(b.title);
}

function completeness(b: Partial<Booking>): number {
  let n = 0;
  for (const k of ["confirmation", "cost", "time", "location", "notes", "endDate", "balanceDue"] as const) {
    if (b[k]) n++;
  }
  return n;
}

/**
 * Bookings generate multiple emails (confirmation + reminders). Collapse records
 * that share a date+title(+location) key, keeping the most complete one and
 * merging in any fields the winner is missing.
 */
export function dedupe(parsed: Array<Partial<Booking>>): Booking[] {
  const groups = new Map<string, Partial<Booking>[]>();
  for (const b of parsed) {
    const k = keyOf(b);
    const arr = groups.get(k) ?? [];
    arr.push(b);
    groups.set(k, arr);
  }
  const result: Booking[] = [];
  for (const arr of groups.values()) {
    arr.sort((a, b) => completeness(b) - completeness(a));
    const merged: Partial<Booking> = {};
    // Fill from least- to most-complete so the most-complete value wins.
    for (let i = arr.length - 1; i >= 0; i--) {
      Object.assign(merged, clean(arr[i]!));
    }
    if (merged.title) result.push(merged as Booking);
  }
  return result;
}

function clean<T extends object>(o: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}
