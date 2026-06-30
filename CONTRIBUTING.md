# Contributing to Wayfare

Thanks for helping. The two highest-value contributions are **new booking
providers** and **themes** — both are small, self-contained, and immediately
useful.

## Setup

```bash
npm install
npm test          # node:test suites
npm run typecheck
npm run example    # render the sample to examples/sample-trip.html
```

Node 20+ required. The core package has **zero runtime dependencies** — please
keep it that way. Anything needing a dependency (OAuth connectors, PDF export)
belongs in a separate adapter package, not in `src/`.

## Add a booking provider

1. Add an entry to `PROVIDERS` in `src/parsers.ts` with `match()` and `parse()`.
   Match on the sender domain first; parse conservatively (return only what you
   can read — leave the rest undefined so dedupe can merge).
2. Add a fixture-based test in `test/parsers.test.ts` using a realistic (but
   **fictional**) email. Never commit real emails or personal data.
3. Note the search pattern in `skill/references/booking-providers.md`.

## Add a theme

Copy a token set in `src/themes.ts`, register it in `THEMES`, and check the
example still renders (`npm run example`). Aim for AA contrast on text.

## Add a component (block type)

Add a variant to the `Block` union in `src/types.ts`, a case in
`renderBlock()` in `src/render.ts`, and the enum in `schema/trip.schema.json`.
Add a render test.

## Conventions

- Conventional Commits (`feat:`, `fix:`, `docs:`…). Small, focused PRs.
- No personal data anywhere in the repo. The sample trip is fictional; keep it so.
- Read-only on user accounts: nothing in this project should send, modify, or
  delete a user's email or calendar.
- CI (typecheck + tests + build + example render) must pass.

By contributing you agree your work is licensed under the project's MIT license.
