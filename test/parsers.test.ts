import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMessages, dedupe } from "../src/parsers.js";
import type { EmailMessage } from "../src/connectors.js";

const airbnbConfirm: EmailMessage = {
  id: "m1",
  from: "Airbnb <automated@airbnb.com>",
  subject: "Reservation confirmed for Casa do Bairro",
  date: "2026-08-01",
  body: "Your trip is booked!\nConfirmation code\nBK20471\nAddress: Alfama, Lisbon\nTotal $620.00",
};

const airbnbReminder: EmailMessage = {
  id: "m2",
  from: "Airbnb <automated@airbnb.com>",
  subject: "Reservation confirmed for Casa do Bairro",
  date: "2026-08-15",
  body: "Reminder for your upcoming stay. Confirmation code\nBK20471",
};

const stripe: EmailMessage = {
  id: "m3",
  from: "Stripe <receipts@stripe.com>",
  subject: "Receipt from Benagil Tours",
  date: "2026-08-02",
  body: "Amount paid $35.00. Thank you.",
};

test("recognizes Airbnb and extracts confirmation + cost", () => {
  const [r] = parseMessages([airbnbConfirm]);
  assert.equal(r?.provider, "Airbnb");
  assert.equal(r?.booking.confirmation, "BK20471");
  assert.equal(r?.booking.cost?.amount, 620);
  assert.equal(r?.booking.category, "lodging");
});

test("Stripe receipt is recognized as a reserved/payment record", () => {
  const [r] = parseMessages([stripe]);
  assert.equal(r?.provider, "Stripe / PayPal receipt");
  assert.equal(r?.booking.status, "reserved");
  assert.equal(r?.booking.cost?.amount, 35);
});

test("dedupe collapses confirmation + reminder into one, keeping richest", () => {
  const parsed = parseMessages([airbnbConfirm, airbnbReminder]).map((r) => r.booking);
  const merged = dedupe(parsed);
  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.confirmation, "BK20471");
  assert.equal(merged[0]?.cost?.amount, 620); // came from the richer confirmation email
});

test("unrecognized mail is ignored", () => {
  const junk: EmailMessage = { id: "x", from: "newsletter@news.com", subject: "Deals!", body: "buy now" };
  assert.equal(parseMessages([junk]).length, 0);
});
