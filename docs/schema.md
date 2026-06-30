# Trip schema

A trip is plain JSON validated by [`schema/trip.schema.json`](../schema/trip.schema.json).
Associate that schema in your editor for autocomplete:

```json
{
  "$schema": "./schema/trip.schema.json",
  "title": "My Trip",
  "sections": []
}
```

## Shape

```
Trip
├─ title (required)        string, supports **bold** / *italic*
├─ subtitle, kicker        string
├─ start, end             "YYYY-MM-DD"
├─ currency               ISO 4217, default for costs
├─ theme                  built-in name | inline token overrides
├─ bookings[]            flat pool; bookingTable blocks filter it
└─ sections[] (required)
   └─ { id, label, blocks[] }
```

## Booking

```
{ title (required), category, status, date, time, endDate, location,
  bookBy, confirmation, cost {amount,currency}, balanceDue, tags[], notes,
  links[ {label,url} ], source }
```

- `category`: flight · lodging · activity · dining · transport · wellness · event · other
- `status`: idea · toBook · reserved · confirmed · done · cancelled

## Blocks

| type | purpose | key fields |
|---|---|---|
| `lead` | intro paragraph | `text` |
| `heading` | section sub-heading | `text`, `num?` |
| `callout` | highlighted note | `text` |
| `cards` | card grid; numbered if `priority` | `items[]`, `priority?` |
| `checklist` | tappable to-dos | `items[]` |
| `bookingTable` | booking rows w/ status badges | `variant?`, `rows?` or `filter?` |
| `dayGrid` | day-by-day plan | `days[]` |
| `baseSwitcher` | toggle between bases | `bases[]` (each has `blocks[]`) |

Inline markup in text fields: `**bold**` and `[label](https://url)`. Everything
is HTML-escaped first, so user content is safe.

See [`../examples/sample-trip.json`](../examples/sample-trip.json) for a full example.
