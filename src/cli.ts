#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { renderTrip } from "./render.js";
import { THEMES } from "./themes.js";
import { validateTrip } from "./validate.js";
import { parseICS, StaticCalendarSource } from "./connectors.js";
import { autofillBookings } from "./autofill.js";
import { SAMPLE_TRIP } from "./sample.js";

function arg(flags: string[], argv: string[]): string | undefined {
  for (const f of flags) {
    const i = argv.indexOf(f);
    if (i !== -1 && argv[i + 1]) return argv[i + 1];
  }
  return undefined;
}

const HELP = `wayfare — beautiful single-file travel itineraries

Usage:
  wayfare build <trip.json> [-o out.html] [--theme NAME]
  wayfare init [trip.json]                 write a sample trip to edit
  wayfare import-ics <cal.ics> [-o bookings.json]   bookings from a calendar export
  wayfare themes                           list built-in themes
  wayfare --help

Docs: https://github.com/your-org/wayfare`;

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);

  if (!cmd || cmd === "--help" || cmd === "-h") {
    console.log(HELP);
    return;
  }

  if (cmd === "themes") {
    for (const name of Object.keys(THEMES)) console.log(name);
    return;
  }

  if (cmd === "init") {
    const out = rest[0] ?? "trip.json";
    await writeFile(out, JSON.stringify(SAMPLE_TRIP, null, 2));
    console.log(`Wrote sample trip to ${out}. Edit it, then: wayfare build ${out}`);
    return;
  }

  if (cmd === "build") {
    const input = rest.find((a) => !a.startsWith("-"));
    if (!input) throw new Error("build needs a <trip.json> path");
    const out = arg(["-o", "--out"], rest) ?? input.replace(/\.json$/, "") + ".html";
    const theme = arg(["--theme"], rest);
    const raw = JSON.parse(await readFile(input, "utf8"));
    const v = validateTrip(raw);
    if (!v.ok) {
      console.error("Invalid trip:\n  - " + v.errors.join("\n  - "));
      process.exit(1);
    }
    const html = renderTrip(v.trip, theme ? { theme } : {});
    await writeFile(out, html);
    console.log(`Rendered ${out} (${(html.length / 1024).toFixed(0)} KB, ${v.trip.sections.length} sections).`);
    return;
  }

  if (cmd === "import-ics") {
    const input = rest.find((a) => !a.startsWith("-"));
    if (!input) throw new Error("import-ics needs a <cal.ics> path");
    const out = arg(["-o", "--out"], rest) ?? "bookings.json";
    const events = parseICS(await readFile(input, "utf8"));
    const { bookings, stats } = await autofillBookings({ calendar: new StaticCalendarSource(events) });
    await writeFile(out, JSON.stringify(bookings, null, 2));
    console.log(`Parsed ${stats.calendarEvents} events → ${bookings.length} bookings → ${out}`);
    return;
  }

  console.error(`Unknown command "${cmd}".\n\n${HELP}`);
  process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
