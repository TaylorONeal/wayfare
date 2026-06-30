# Wayfare

Turn travel bookings into one **beautiful, single-file HTML itinerary**. Let your
connected Gmail and Calendar do the data entry, so you barely type a thing.

- **Looks designed, not generated** — real typography, a sticky tab bar, status
  badges, a numbered "Book Next" list, tappable checklists, day grids.
- **One file, no build, offline, mobile-first** — open it on a plane.
- **Connector-driven** — pull flights, lodging, activities, and dining from
  email/calendar (or an `.ics` export). Read-only; nothing is sent or changed.
- **Themeable, zero runtime dependencies.**

> Status: v0.1 scaffold. Core renderer, parsers, autofill, CLI, and the Claude
> Agent Skill are working and tested. See [`docs/PLAN.md`](docs/PLAN.md) for the
> roadmap.

## Quick start

```bash
npm install
npm run build

# scaffold a sample trip and render it
npx wayfare init trip.json
npx wayfare build trip.json -o itinerary.html
open itinerary.html
```

Or use it as a library:

```ts
import { renderTrip } from "wayfare";

const html = renderTrip({
  title: "Lisbon & the Algarve",
  start: "2026-09-12",
  end: "2026-09-22",
  theme: "sand",
  sections: [
    { id: "daily", label: "Daily", blocks: [
      { type: "dayGrid", days: [
        { date: "2026-09-12", primary: "Land LIS · settle in Alfama", kind: "highlight" },
      ]},
    ]},
  ],
});
```

See [`examples/sample-trip.json`](examples/sample-trip.json) for a complete,
fictional trip that exercises every component, and
[`examples/sample-trip.html`](examples/sample-trip.html) for the rendered result.

## Let connectors do the work

Wayfare never talks to Gmail directly — it consumes plain `Booking` objects, so
anything that can produce messages or events can feed it.

```ts
import { autofillBookings, renderTrip } from "wayfare";

const { bookings, stats } = await autofillBookings({ email, calendar });
// → flights, hotels, tours, dinners — parsed and deduped from your inbox
const html = renderTrip({ title: "My Trip", sections, bookings });
```

- **With Claude:** install the Agent Skill in [`skill/`](skill/SKILL.md). It uses
  your connected Gmail/Calendar to fill the schema and renders for you — the
  "do as little as possible" path.
- **Offline / no Claude:** export your calendar and run
  `npx wayfare import-ics trip.ics -o bookings.json`.
- **Custom:** implement `EmailSource` / `CalendarSource` (e.g. over the Gmail API).

How parsing works: travel bookings flow through a small set of platforms, each
with a stable sender domain. Wayfare matches by domain, extracts the booking,
and dedupes the confirmation/reminder copies. See
[`skill/references/booking-providers.md`](skill/references/booking-providers.md).

## Themes

Built in: `sand` (warm, default), `midnight` (dark), `coast` (cool). Pass a name
or an inline token override:

```ts
renderTrip(trip, { theme: "midnight" });
```

See [`docs/theming.md`](docs/theming.md).

## CLI

```
wayfare build <trip.json> [-o out.html] [--theme NAME]
wayfare init [trip.json]                 write a sample trip
wayfare import-ics <cal.ics> [-o out]    bookings from a calendar export
wayfare themes                           list built-in themes
```

## Privacy

Wayfare only **reads** your accounts to gather bookings. It never sends email,
never modifies or deletes anything. Trip files can contain confirmation codes and
addresses, so `*.local.json` and `/private/` are git-ignored by default — keep
your real trips out of version control.

## Contributing

Issues and PRs welcome — especially new booking providers and themes. See
[`CONTRIBUTING.md`](CONTRIBUTING.md). MIT licensed.
