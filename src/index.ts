/**
 * Wayfare — turn travel bookings into a beautiful, single-file HTML itinerary.
 *
 * Public API. Example:
 *
 *   import { renderTrip } from "wayfare";
 *   const html = renderTrip(trip);
 *
 * Or, to let connectors do the work:
 *
 *   import { autofillBookings, renderTrip } from "wayfare";
 *   const { bookings } = await autofillBookings({ email, calendar });
 *   const html = renderTrip({ ...trip, bookings });
 */
export { renderTrip } from "./render.js";
export type { RenderOptions } from "./render.js";
export { THEMES, DEFAULT_THEME, resolveTheme } from "./themes.js";
export { autofillBookings } from "./autofill.js";
export type { AutofillOptions, AutofillResult } from "./autofill.js";
export {
  parseMessages,
  dedupe,
  PROVIDERS,
} from "./parsers.js";
export type { Provider, ParseResult } from "./parsers.js";
export {
  parseICS,
  StaticEmailSource,
  StaticCalendarSource,
} from "./connectors.js";
export type {
  EmailSource,
  CalendarSource,
  EmailMessage,
  CalendarEvent,
} from "./connectors.js";
export { validateTrip } from "./validate.js";
export type * from "./types.js";
