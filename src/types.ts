/**
 * Wayfare data model.
 *
 * A Trip is plain data (write it by hand, or have a connector fill it in) that
 * the renderer turns into a single self-contained HTML page. Content is kept
 * separate from presentation: a Trip describes *what* is in the itinerary, a
 * Theme describes *how* it looks.
 */

/** ISO date, e.g. "2026-07-30". Time is optional and local to the destination. */
export type ISODate = string;

/**
 * Where a booking sits in its lifecycle. This is the single most useful
 * abstraction learned from real trip planning: an itinerary item is rarely
 * just "done" or "not done".
 *
 *  - idea       something you might do; no action taken
 *  - toBook     decided, but not yet reserved (pair with `bookBy`)
 *  - reserved   held/deposit paid, but not fully settled (pair with `balanceDue`)
 *  - confirmed  fully booked (pair with `confirmation`)
 *  - done       already happened
 *  - cancelled  was booked, now cancelled (kept for the record)
 */
export type BookingStatus =
  | "idea"
  | "toBook"
  | "reserved"
  | "confirmed"
  | "done"
  | "cancelled";

/** Broad category, used for color-coding and grouping. Extend freely. */
export type BookingCategory =
  | "flight"
  | "lodging"
  | "activity"
  | "dining"
  | "transport"
  | "wellness"
  | "event"
  | "other";

export interface Money {
  amount: number;
  /** ISO 4217, e.g. "USD". */
  currency: string;
}

export interface Link {
  label: string;
  url: string;
}

/**
 * A single bookable thing. Connectors produce these from email/calendar; you
 * can also write them by hand. Only `title` is required so partial records from
 * parsers are valid and can be merged/deduped later.
 */
export interface Booking {
  /** Stable id; if omitted the renderer derives one from title+date. */
  id?: string;
  title: string;
  category?: BookingCategory;
  status?: BookingStatus;

  /** When it happens. */
  date?: ISODate;
  /** Local start time, e.g. "18:30" or "6:30 PM". */
  time?: ISODate | string;
  endDate?: ISODate;

  /** Free-text place; or structured location. */
  location?: string;

  /** Lifecycle helpers. */
  bookBy?: ISODate; // for status "toBook"
  confirmation?: string; // for status "confirmed"
  cost?: Money;
  balanceDue?: Money; // for status "reserved"

  /** Dietary/accessibility/etc. short tags, e.g. ["GF", "max 4"]. */
  tags?: string[];

  notes?: string;
  links?: Link[];

  /** Provenance — which connector/parser produced this. */
  source?: string;
}

/* ------------------------------------------------------------------ */
/* Content blocks — the vocabulary a section is built from.            */
/* Each maps to one component in the renderer. Add a block type by     */
/* adding a variant here and a case in render.ts.                      */
/* ------------------------------------------------------------------ */

export interface LeadBlock {
  type: "lead";
  text: string;
}

export interface HeadingBlock {
  type: "heading";
  text: string;
  /** Optional small label shown before the heading, e.g. "01". */
  num?: string;
}

export interface CalloutBlock {
  type: "callout";
  /** Supports a tiny subset of inline markup: **bold** and [text](url). */
  text: string;
}

export interface CardsBlock {
  type: "cards";
  /** Render as a numbered "do these next" list when true. */
  priority?: boolean;
  items: Array<{
    title: string;
    badge?: string;
    badgeKind?: BadgeKind;
    body?: string;
    meta?: string[];
    links?: Link[];
  }>;
}

export interface ChecklistBlock {
  type: "checklist";
  items: string[];
}

/**
 * A list of bookings rendered as compact rows with a status badge. This is the
 * workhorse component (the "Book Next" / dining / stays lists).
 */
export interface BookingTableBlock {
  type: "bookingTable";
  /** Left-border accent. */
  variant?: BookingCategory;
  /** Either inline rows, or pull from the trip's `bookings` by filter. */
  rows?: Booking[];
  filter?: { category?: BookingCategory; status?: BookingStatus | BookingStatus[] };
}

export interface DayRow {
  date: ISODate; // "2026-07-30"
  /** Optional override label; otherwise derived from `date`. */
  weekday?: string;
  primary: string; // main plan for the day
  secondary?: string; // evening / secondary line
  note?: string; // booking reminder / logistics
  kind?: "default" | "rest" | "walk" | "booked" | "highlight";
}

export interface DayGridBlock {
  type: "dayGrid";
  days: DayRow[];
}

/**
 * A switcher between alternative "bases" (e.g. different lodging neighborhoods),
 * each with its own day grid or blocks. Generalizes the lodging-base toggle.
 */
export interface BaseSwitcherBlock {
  type: "baseSwitcher";
  bases: Array<{
    id: string;
    label: string;
    blocks: Block[];
  }>;
}

export type Block =
  | LeadBlock
  | HeadingBlock
  | CalloutBlock
  | CardsBlock
  | ChecklistBlock
  | BookingTableBlock
  | DayGridBlock
  | BaseSwitcherBlock;

export type BadgeKind =
  | "gold"
  | "clay"
  | "jungle"
  | "ink"
  | "line"
  | "book"
  | "booked";

export interface Section {
  /** URL-safe id used for the tab. */
  id: string;
  label: string;
  blocks: Block[];
}

export interface Trip {
  /** Schema version for forward-compat. */
  version?: 1;
  title: string;
  subtitle?: string;
  /** Small uppercase label above the title. */
  kicker?: string;
  start?: ISODate;
  end?: ISODate;
  /** Default ISO 4217 currency for costs that omit one. */
  currency?: string;
  /** Built-in theme name, or an inline partial token set. */
  theme?: string | Partial<ThemeTokens>;
  sections: Section[];
  /** Optional flat booking pool that BookingTable blocks can filter against. */
  bookings?: Booking[];
}

/* ------------------------------------------------------------------ */
/* Theming                                                            */
/* ------------------------------------------------------------------ */

export interface ThemeTokens {
  sand: string;
  sandDeep: string;
  paper: string;
  ink: string;
  inkSoft: string;
  inkFaint: string;
  accent: string; // primary accent (was "clay")
  accentDeep: string;
  secondary: string; // secondary accent (was "jungle")
  secondaryDeep: string;
  gold: string;
  goldSoft: string;
  radius: string;
  /** Google Fonts families: [display, body, optional script]. */
  fonts: { display: string; body: string; script?: string };
}

export interface Theme {
  name: string;
  tokens: ThemeTokens;
}
