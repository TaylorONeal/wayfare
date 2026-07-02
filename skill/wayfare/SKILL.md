---
name: wayfare
description: >-
  Build a beautiful single-file HTML travel itinerary from the user's own
  bookings. Use when someone wants to plan, organize, or visualize a trip; turn
  scattered confirmations into one page; or "make an itinerary." Reads flights,
  lodging, activities, and dining from connected Gmail and Calendar (or an .ics
  export) so the user types as little as possible, then renders with the Wayfare
  renderer.
license: MIT
---

# Wayfare — itinerary builder

Turn a user's trip into one self-contained HTML page that looks designed, not generated. The user should do almost nothing: read their inbox and calendar, assemble the data, render.

## When to use

Trigger on: "plan my trip," "make an itinerary," "organize my bookings," "what's confirmed for X," "turn my confirmations into a page," or any travel-planning request where the user has bookings in email/calendar.

## The flow (minimize what you ask the user)

1. **Get the trip frame.** Ask only what you cannot infer: destination(s) and rough dates. One question, not ten. Everything else comes from their data.

2. **Pull bookings from connectors.** This is the whole point — do not make the user re-type confirmations.
   - **Gmail:** run the provider searches in `references/booking-providers.md`. Search by sender domain first (highest precision), subject second. Pull the matching messages.
   - **Calendar:** list events in the trip date range for fixed commitments (tours with set times, reservations, transfers).
   - If no Gmail/Calendar connector is available, ask the user to export their calendar as `.ics` and use `wayfare import-ics`, or paste a few confirmations.

3. **Parse + dedupe.** For each message, extract: title, category, date/time, location, confirmation code, cost, balance due. Remember:
   - A booking generates several emails (confirmation + reminders) — **dedupe by title**, keep the richest record.
   - **A confirmation email is not the event date.** The stay/activity date lives in the body or the calendar, not the email header.
   - **A payment receipt (Stripe/PayPal) usually means a deposit/hold, not a full booking** — mark `reserved` and verify.
   - You can run the bundled parser registry (`parseMessages` + `dedupe` from the `wayfare` package) over the message texts instead of hand-rolling regexes.

4. **Assemble a `Trip`** matching `references/trip.schema.json`. Map each booking to a `status`:
   `idea → toBook (with bookBy) → reserved (deposit/balanceDue) → confirmed (confirmation#) → done`.
   Organize into sections/tabs. Good defaults: **Book Next** (a priority `cards` block of anything `toBook`/`reserved`), **Daily** (a `dayGrid`), then category tabs (**Stays**, **Food**, **Activities**) using `bookingTable` blocks that filter the booking pool. Use a `baseSwitcher` when the trip has multiple lodging bases.

5. **Render.** `wayfare build trip.json -o itinerary.html` (or call `renderTrip(trip)`). Hand the user the single HTML file — it works offline and on mobile.

6. **Confirm the open loops.** End by listing what still needs action (anything `toBook`/`reserved`) and offer to add those to a task list or calendar.

## Hard rules

- **Read-only on the user's accounts.** Never send email, never modify or delete messages, never change calendar events. You only read to gather bookings.
- **Never put the user's data in the repo.** Trip files may contain confirmation codes and addresses. Keep them in the user's working folder, not in any commit. The package's `.gitignore` already excludes `*.local.json` and `/private/`.
- **Don't invent bookings.** If a field isn't in the source, leave it out. Mark uncertain attendance/holds rather than asserting "confirmed."
- **Verify before asserting "confirmed."** Prefer records that have a confirmation code or a matching reminder.

## Reference

Bundled with this skill (load only when you need them):

- `references/booking-providers.md` — the Gmail search patterns by platform, generalized for travel.
- `references/trip.schema.json` — the data shape to produce (mirror of the `wayfare` package's `schema/trip.schema.json`).
- `references/sample-trip.json` — a complete, fictional example to mirror.
