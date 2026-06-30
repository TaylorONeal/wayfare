import { test } from "node:test";
import assert from "node:assert/strict";
import { renderTrip } from "../src/render.js";
import { SAMPLE_TRIP } from "../src/sample.js";
import type { Trip } from "../src/types.js";

test("renders a complete HTML document", () => {
  const html = renderTrip(SAMPLE_TRIP);
  assert.match(html, /^<!doctype html>/);
  assert.match(html, /<\/html>\s*$/);
  assert.ok(html.includes("Lisbon"));
});

test("emits a tab per section and one active panel", () => {
  const html = renderTrip(SAMPLE_TRIP);
  const tabs = html.match(/role="tab"/g) ?? [];
  assert.equal(tabs.length, SAMPLE_TRIP.sections.length);
  const active = html.match(/class="panel active"/g) ?? [];
  assert.equal(active.length, 1);
});

test("escapes HTML in user content", () => {
  const trip: Trip = {
    title: "Trip <script>alert(1)</script>",
    sections: [{ id: "a", label: "A", blocks: [{ type: "lead", text: "x & y < z" }] }],
  };
  const html = renderTrip(trip);
  assert.ok(!html.includes("<script>alert(1)</script>"));
  assert.ok(html.includes("x &amp; y &lt; z"));
});

test("inline markup renders bold and links", () => {
  const trip: Trip = {
    title: "T",
    sections: [{ id: "a", label: "A", blocks: [{ type: "callout", text: "see **this** [doc](https://example.com)" }] }],
  };
  const html = renderTrip(trip);
  assert.ok(html.includes("<strong>this</strong>"));
  assert.ok(html.includes('<a href="https://example.com">doc</a>'));
});

test("single-asterisk renders italic, not literal", () => {
  const trip: Trip = {
    title: "Lisbon & the *Algarve*",
    sections: [{ id: "a", label: "A", blocks: [{ type: "lead", text: "a *pastel* warm" }] }],
  };
  const html = renderTrip(trip);
  assert.ok(html.includes("<em>Algarve</em>"));
  assert.ok(html.includes("<em>pastel</em>"));
  assert.ok(!html.includes("*Algarve*"));
});

test("booking table filters from the trip pool", () => {
  const html = renderTrip(SAMPLE_TRIP);
  // confirmed flight should appear in Book Next (filtered confirmed/reserved)
  assert.ok(html.includes("TAP Air"));
});

test("theme override changes tokens", () => {
  const light = renderTrip(SAMPLE_TRIP, { theme: "sand" });
  const dark = renderTrip(SAMPLE_TRIP, { theme: "midnight" });
  assert.notEqual(light, dark);
  assert.ok(dark.includes("#0E1320"));
});

test("unknown theme throws", () => {
  assert.throws(() => renderTrip(SAMPLE_TRIP, { theme: "nope" }), /Unknown theme/);
});
