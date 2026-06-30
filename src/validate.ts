import type { Trip } from "./types.js";

/** Lightweight structural validation — no dependency on a JSON Schema runtime. */
export function validateTrip(data: unknown): { ok: true; trip: Trip } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const d = data as Record<string, unknown>;
  if (typeof d !== "object" || d === null) return { ok: false, errors: ["trip must be an object"] };
  if (typeof d.title !== "string" || !d.title) errors.push("`title` is required (string)");
  if (!Array.isArray(d.sections) || d.sections.length === 0) {
    errors.push("`sections` is required (non-empty array)");
  } else {
    d.sections.forEach((s: unknown, i: number) => {
      const sec = s as Record<string, unknown>;
      if (typeof sec.label !== "string") errors.push(`sections[${i}].label is required`);
      if (!Array.isArray(sec.blocks)) errors.push(`sections[${i}].blocks must be an array`);
    });
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, trip: data as Trip };
}
