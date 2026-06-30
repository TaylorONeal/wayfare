# Travel booking providers — Gmail search patterns

Travel bookings, like fitness-class bookings, run through a small set of
platforms. Each has a stable sender domain and recognizable subject lines.
Search by **sender domain first** (highest precision), **subject second**,
**body keyword third**. Every booking usually generates multiple emails
(confirmation + reminders) — dedupe by title and keep the richest record.

> This catalog is a starting point. Layouts and domains change; treat these as
> leads, verify against the message body, and add providers as you encounter
> them. Contributions welcome (see `parsers.ts`).

## Flights

| Provider | Sender | Search |
|---|---|---|
| Most airlines | airline domain | `subject:(flight confirmation OR e-ticket OR itinerary)` |
| Delta / United / American | `delta.com`, `united.com`, `aa.com` | `from:(delta.com OR united.com OR aa.com) confirmation` |
| Intl (Singapore, Qantas, BA, Emirates) | carrier domain | `from:(singaporeair.com OR qantas.com OR ba.com OR emirates.com)` |
| OTAs | `expedia.com`, `kayak.com`, `googleflights` | `subject:itinerary from:expedia.com` |

Pull: route, date, departure time, PNR / record locator, fare.

## Lodging

| Provider | Sender | Search |
|---|---|---|
| Airbnb | `airbnb.com` (`automated@airbnb.com`) | `from:airbnb.com (reservation OR confirmed)` |
| Booking.com | `booking.com` | `from:booking.com confirmed` |
| Expedia / Hotels.com | `expedia.com`, `hotels.com` | `from:hotels.com confirmation` |
| Marriott / Hilton / Hyatt / IHG | brand domain | `from:(marriott.com OR hilton.com OR hyatt.com) confirmation` |
| Vrbo | `vrbo.com` | `from:vrbo.com booking` |

Pull: property name, check-in/out dates, address, confirmation code, total, balance due.

## Activities & tours

| Provider | Sender | Search |
|---|---|---|
| Viator | `viator.com` | `from:viator.com (booking OR confirmed)` |
| GetYourGuide | `getyourguide.com` | `from:getyourguide.com booking` |
| Klook | `klook.com` | `from:klook.com confirmation` |
| Airbnb Experiences | `airbnb.com` | `from:airbnb.com experience` |
| Direct operator | operator domain | `subject:(booking OR confirmation) <operator name>` |

Pull: activity name, date, start time, meeting point, confirmation, price.

## Transport

| Provider | Sender | Search |
|---|---|---|
| Car rental | `hertz.com`, `avis.com`, `enterprise.com`, `sixt.com` | `subject:(car rental OR reservation)` |
| Rail | `raileurope.com`, national rail domains | `from:raileurope.com` |
| Ferries / transfers | operator domain | `subject:(transfer OR ferry) confirmation` |

## Dining

Reservations are easy to miss — they rarely use "booking" language.

| Provider | Sender | Search |
|---|---|---|
| OpenTable | `opentable.com` | `from:opentable.com reservation` |
| Resy | `resy.com` | `from:resy.com confirmed` |
| Tock | `exploretock.com` | `from:exploretock.com` |
| Direct restaurant | restaurant domain | `subject:(reservation OR table) <restaurant>` |

## Payments (deposits & holds)

A payment receipt usually means a **deposit or hold**, not a finished booking.
Mark `reserved` and cross-check against the provider.

| Provider | Sender | Search |
|---|---|---|
| Stripe | `stripe.com` | `from:stripe.com receipt` |
| PayPal | `paypal.com` | `from:paypal.com receipt` |

## Things to verify before trusting a record

- **Confirmation ≠ the event date.** Read the body for the actual date.
- **Confirmation ≠ done.** Look for a confirmation code or a matching reminder.
- **Cancellations:** search `subject:cancel` / `"reservation cancelled"` and drop those.
- **Time zones:** international times need conversion; verify against the body, not a calendar entry in a default zone.
- **Duplicates:** the same booking arrives as confirmation + 1–2 reminders. Dedupe.
