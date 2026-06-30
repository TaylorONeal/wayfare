# Theming

A theme is a set of design tokens turned into CSS custom properties. Pick a
built-in by name, or pass an inline partial override.

```ts
renderTrip(trip, { theme: "midnight" });
renderTrip({ ...trip, theme: { accent: "#0F766E", radius: "16px" } });
```

## Built-in themes

- `sand` — warm paper/clay/jungle (default)
- `midnight` — dark, amber + teal accents
- `coast` — cool, teal + terracotta

## Tokens

| Token | Role |
|---|---|
| `sand`, `sandDeep` | page background |
| `paper` | card surface |
| `ink`, `inkSoft`, `inkFaint` | text (primary / secondary / faint) |
| `accent`, `accentDeep` | primary accent (links, "to book") |
| `secondary`, `secondaryDeep` | secondary accent ("confirmed", lodging) |
| `gold`, `goldSoft` | highlight / "reserved" |
| `radius` | card corner radius |
| `fonts.display` / `fonts.body` / `fonts.script` | Google Fonts family strings |

Fonts are loaded from Google Fonts using the family string verbatim (e.g.
`"Fraunces:ital,opsz,wght@..."`). To self-host or change fonts, edit the token.

## Add a theme

Copy a token set in `src/themes.ts`, register it in `THEMES`, run
`npm run example`, and eyeball contrast. PRs welcome.
