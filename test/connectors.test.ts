import { test } from "node:test";
import assert from "node:assert/strict";
import { parseICS, StaticCalendarSource, StaticEmailSource } from "../src/connectors.js";
import { autofillBookings } from "../src/autofill.js";

const ICS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:evt-1
SUMMARY:Benagil sea-cave kayak tour
DTSTART:20260919T090000Z
DTEND:20260919T120000Z
LOCATION:Lagos\\, Algarve
DESCRIPTION:Bring water and a dry bag
END:VEVENT
BEGIN:VEVENT
UID:evt-2
SUMMARY:Sintra day trip
DTSTART;VALUE=DATE:20260914
END:VEVENT
END:VCALENDAR`;

test("parseICS reads timed and all-day events with unescaping", () => {
  const events = parseICS(ICS);
  assert.equal(events.length, 2);
  assert.equal(events[0]?.summary, "Benagil sea-cave kayak tour");
  assert.equal(events[0]?.start, "2026-09-19");
  assert.equal(events[0]?.startTime, "09:00");
  assert.equal(events[0]?.location, "Lagos, Algarve");
  assert.equal(events[1]?.start, "2026-09-14");
});

test("autofill combines calendar + email into deduped bookings", async () => {
  const events = parseICS(ICS);
  const email = new StaticEmailSource([
    {
      id: "m1",
      from: "Viator <no-reply@viator.com>",
      subject: "Your booking confirmed: Benagil sea-cave kayak tour",
      date: "2026-08-01",
      body: "Confirmation: VTR12345 Total €65.00",
    },
  ]);
  const { bookings, stats } = await autofillBookings({
    email,
    calendar: new StaticCalendarSource(events),
  });
  assert.ok(stats.calendarEvents === 2);
  // The kayak tour appears in both sources; dedupe should not duplicate it.
  const kayaks = bookings.filter((b) => /kayak/i.test(b.title));
  assert.equal(kayaks.length, 1);
});
