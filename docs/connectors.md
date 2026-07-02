# Connectors

A connector is any source of bookings. The renderer consumes plain `Booking`
objects, so the core never depends on Gmail or a calendar API. Two interfaces:

```ts
interface EmailSource    { search(query: string): Promise<EmailMessage[]>; }
interface CalendarSource { listEvents(range?): Promise<CalendarEvent[]>; }
```

## Three ways to feed Wayfare

1. **Claude Agent Skill** (`skill/wayfare/SKILL.md`) — Claude uses your connected
   Gmail/Calendar, runs the provider searches, and fills the trip. Lowest effort.

2. **`.ics` export (offline, built in)** — export your calendar and run:
   ```bash
   wayfare import-ics trip.ics -o bookings.json
   ```
   `parseICS` is a dependency-free RFC 5545 VEVENT reader.

3. **Custom adapter** — implement the interfaces. Example sketch over the Gmail API:
   ```ts
   class GmailSource implements EmailSource {
     async search(q: string) {
       const ids = await gmail.users.messages.list({ userId: "me", q });
       // ...fetch each, map to { id, from, subject, date, body }
     }
   }
   ```
   Keep OAuth/secret handling in your adapter package, not in core.

## The pipeline

```
search/listEvents → parseMessages (provider registry) → dedupe → Booking[]
```

`autofillBookings({ email, calendar })` runs the whole thing and returns
`{ bookings, stats }`. It is **read-only** and sends nothing.

## Writing a parser

See `src/parsers.ts`. A `Provider` matches on sender domain first, then extracts
a partial `Booking`. Be conservative: return what you can read, leave the rest
undefined so dedupe/merge can combine confirmation + reminder + calendar copies.
Remember the email's received date is **not** the booking date.
