# Wayfare — project plan

This is the thinking behind the repo: what was worth generalizing, how it's put
together, and how to take it public. It's deliberately concrete so another
contributor (or agent) can pick it up mid-stream.

## What this is

A small library + CLI + Claude Agent Skill that turns travel bookings into one
self-contained HTML itinerary that looks designed. Connectors (Gmail, Calendar,
or an `.ics` export) do the data entry so the user barely types.

Three usable surfaces, one core:

```
              ┌─────────────────────────────────────────┐
              │            Trip (plain data)             │
              │  sections → blocks · bookings · theme    │
              └───────────────┬─────────────────────────┘
   inputs                     │                    output
 ┌──────────┐   autofill   ┌──▼───────┐  renderTrip  ┌──────────────┐
 │ Gmail    │─────────────▶│ parsers  │─────────────▶│ single-file  │
 │ Calendar │   (read-only)│ + dedupe │              │ HTML page    │
 │ .ics     │              └──────────┘              └──────────────┘
 └──────────┘
```

- **Standalone library/CLI** (Node/TypeScript, zero runtime deps): `renderTrip`, `autofillBookings`, `parseICS`, the CLI.
- **Claude Agent Skill** (`/skill`): orchestrates connectors to fill the schema, then renders. This is where "do as little as possible" actually happens.

## What we learned that was worth generalizing

These are the non-obvious principles distilled from real trip planning, each now
encoded in the code:

1. **The booking lifecycle is the core abstraction.** An itinerary item is
   rarely just done/not-done. `idea → toBook (bookBy) → reserved (deposit /
   balanceDue) → confirmed (confirmation#) → done → cancelled`. Status drives the
   badge and the "Book Next" list. (`types.ts:BookingStatus`)

2. **Platforms, not vendors.** Bookings flow through a handful of platforms
   (Airbnb, Booking.com, Viator, OpenTable, Stripe…), each with a stable sender
   domain and subject pattern. Match by domain first. This is the same insight
   that made email-based attendance logging reliable, ported to travel.
   (`parsers.ts`, `skill/references/booking-providers.md`)

3. **A confirmation email is not the event date.** The received date ≠ the stay
   or activity date. Using the header date silently breaks dedupe and misleads
   the reader. Dates come from the body or a matching calendar event.
   (caught by a test; see `parsers.ts:parseMessages`)

4. **One booking, many emails.** Confirmation + reminders + a calendar entry all
   describe one thing. Dedupe by title, keep the richest record, merge missing
   fields. (`parsers.ts:dedupe`)

5. **A receipt is a hold, not a plan.** Stripe/PayPal receipts usually mean a
   deposit. Mark `reserved`, surface a balance due, verify. (`parsers.ts`)

6. **Content separate from presentation.** A `Trip` says *what*; a `Theme` says
   *how*. Same data renders in any theme; new components are added as block
   types. (`types.ts`, `themes.ts`, `render.ts`)

7. **The output is the product.** Single file, no build, offline, mobile-first,
   real typography and a paper-grain texture, a sticky tab bar, status badges, a
   numbered "do next" list, tappable checklists, and an optional base-switcher.
   Most planners output tables; this outputs something people keep open.

8. **Read-only, privacy-first.** The tooling only reads accounts. Trip files can
   hold confirmation codes and addresses, so they're git-ignored by default and
   never committed.

## Repo layout

```
wayfare/
  src/
    types.ts         data model (Trip, Booking, Block, Theme) — the contract
    themes.ts        built-in themes + resolver (sand / midnight / coast)
    render.ts        Trip → self-contained HTML (the design system)
    parsers.ts       provider registry + parseMessages + dedupe
    connectors.ts    EmailSource / CalendarSource interfaces + ICS parser + fixtures
    autofill.ts      orchestration: sources → deduped Booking[]
    validate.ts      lightweight structural validation
    sample.ts        fictional sample trip (exercises every block)
    cli.ts           build / init / import-ics / themes
    index.ts         public API
  schema/trip.schema.json   JSON Schema (editor autocomplete + validation)
  skill/                    Claude Agent Skill (SKILL.md + references/)
  examples/                 sample-trip.json + generated sample-trip.html
  test/                     node:test suites (render, parsers, connectors)
  docs/                     this plan + schema/theming/connectors guides
  .github/workflows/ci.yml  typecheck + test on push/PR
```

## Config surface (intentionally broad)

The original was hard-coded to one trip. Generalized config lives in the `Trip`:

- **Trip-level:** `title`, `subtitle`, `kicker`, `start`/`end`, `currency`, `theme`.
- **Theme:** built-in name *or* an inline partial token set (colors, radius, fonts).
- **Sections:** any number of tabs, any order, each a list of typed **blocks**:
  `lead · heading · callout · cards (incl. priority) · checklist · bookingTable
  (inline rows or filtered from the pool) · dayGrid · baseSwitcher`.
- **Bookings pool:** a flat list that `bookingTable` blocks filter by category/status,
  so the same booking can appear in "Book Next" and in "Stays" without duplication.

Adding a component = add a block variant in `types.ts` + a case in `render.ts`.
Adding a provider = push to `PROVIDERS` in `parsers.ts`. Adding a theme = add a
token set in `themes.ts`.

## Roadmap

**v0.1 (this scaffold) — done**
Renderer, theme system, schema + types, parser registry + dedupe, ICS import,
autofill orchestration, CLI, Skill, tests, CI, sample.

**v0.2 — connectors for real**
- Optional `@wayfare/gmail` and `@wayfare/calendar` adapter packages implementing
  `EmailSource`/`CalendarSource` over OAuth (kept out of core so core stays
  dependency-free and secret-free).
- A "review" pass: show parsed bookings, let the user confirm/edit before render.
- More providers + body date extraction per provider.

**v0.3 — output polish**
- Print/PDF stylesheet; "export to calendar" (.ics out); per-section maps;
  multi-currency totals; a few more themes.
- Optional `localStorage` persistence for checklist state (off by default).

**v0.4 — distribution**
- `npx wayfare` ergonomics, a minimal hosted "paste your .ics → get HTML" demo,
  a VS Code snippet/schema association.

## Getting it to GitHub (open source)

1. **Pick the public name.** Verify the repo + npm name are free (`npm view <name>`).
   If `wayfare` is taken, rename in `package.json`, `bin`, and docs.
2. **Scrub for personal data.** Confirm no real names, emails, addresses, or
   confirmation codes anywhere (`git grep -iE` for likely tokens). The sample is
   fictional; keep it that way. Real trips stay out via `.gitignore`.
3. **Set the repo identity.** Replace `your-org` placeholders in
   `package.json`, `schema/$id`, and CLI help with the real GitHub org/user.
4. **Init and commit.**
   ```bash
   git init -b main
   git add .
   git commit -m "feat: initial Wayfare scaffold"
   ```
5. **Create the GitHub repo and push.** Either with the `gh` CLI
   (`gh repo create <org>/wayfare --public --source . --push`) or by creating it
   in the GitHub UI and `git remote add origin … && git push -u origin main`.
   (Repo/account creation and auth are user actions — do them yourself.)
6. **Turn on the basics.** Branch protection on `main`, require CI to pass,
   enable Issues/Discussions, add topics (`travel`, `itinerary`, `html`,
   `claude`, `agent-skill`).
7. **Tag a release.** `npm version 0.1.0` → push tags. Publish to npm later
   (`npm publish --access public`) once the name is settled.
8. **Announce with the artifact.** The README links the live `examples/sample-trip.html`;
   that single file is the pitch.

## Non-goals (for now)

- No account creation, sending, or money movement — ever.
- No server or database in core. The output is a file.
- No scraping of sites that forbid it; connectors read the user's own data only.
