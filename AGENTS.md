# AGENTS.md

Guidance for AI agents (and humans) working in this repo.

## What this project is

A library + CLI + Claude Agent Skill that renders a `Trip` (plain data) into a
single self-contained HTML itinerary, and that can autofill the trip's bookings
from Gmail/Calendar/`.ics`. Read `docs/PLAN.md` first.

## Ground rules

- **Core stays dependency-free.** No runtime `dependencies` in `package.json`.
  OAuth connectors, PDF export, etc. go in separate adapter packages.
- **Read-only on user accounts.** Never send, modify, or delete a user's email
  or calendar. Connectors only read.
- **No personal data in the repo.** The sample trip is fictional. Real trips are
  git-ignored (`*.local.json`, `/private/`). Do not commit confirmation codes,
  addresses, names, or emails.
- **Content vs. presentation.** Data shape lives in `src/types.ts`; appearance in
  `src/themes.ts` + `src/render.ts`. Keep them separate.

## Where things live

| Task | File |
|---|---|
| Change the data model | `src/types.ts` (+ `schema/trip.schema.json`) |
| Add/adjust a component | `src/render.ts` (`renderBlock`) |
| Add a theme | `src/themes.ts` |
| Add an email provider | `src/parsers.ts` (+ `skill/wayfare/references/booking-providers.md`) |
| Add a data source | `src/connectors.ts` |
| Change orchestration | `src/autofill.ts` |
| CLI commands | `src/cli.ts` |

## Before you finish

```bash
npm run typecheck && npm test && npm run example
```

All three must pass. Update this file and `docs/PLAN.md` when you change
architecture or add a subsystem, so the next agent can resume cleanly.
