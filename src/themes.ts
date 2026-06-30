import type { Theme, ThemeTokens } from "./types.js";

/**
 * Built-in themes. A theme is just a set of design tokens; the renderer turns
 * them into CSS custom properties. Add your own by copying one of these.
 */

const sand: ThemeTokens = {
  sand: "#F1E7D6",
  sandDeep: "#E7DAC3",
  paper: "#FBF6EC",
  ink: "#241B12",
  inkSoft: "#6A5C49",
  inkFaint: "#9A8B73",
  accent: "#B25531",
  accentDeep: "#8C3C1C",
  secondary: "#3C5A40",
  secondaryDeep: "#284030",
  gold: "#C08A22",
  goldSoft: "#E9D08A",
  radius: "13px",
  fonts: {
    display: "Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..600",
    body: "Hanken+Grotesk:wght@400;500;600;700",
  },
};

const midnight: ThemeTokens = {
  sand: "#0E1320",
  sandDeep: "#0A0F19",
  paper: "#171E2E",
  ink: "#EAF0FB",
  inkSoft: "#A9B6CE",
  inkFaint: "#6E7C97",
  accent: "#E0A458",
  accentDeep: "#F2BE78",
  secondary: "#5FB6A8",
  secondaryDeep: "#86D2C5",
  gold: "#E0A458",
  goldSoft: "#3A3322",
  radius: "13px",
  fonts: {
    display: "Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..600",
    body: "Hanken+Grotesk:wght@400;500;600;700",
  },
};

const coast: ThemeTokens = {
  sand: "#EAF0F2",
  sandDeep: "#D9E4E8",
  paper: "#FFFFFF",
  ink: "#16242B",
  inkSoft: "#4D6470",
  inkFaint: "#8AA0AC",
  accent: "#1F7A8C",
  accentDeep: "#155E6D",
  secondary: "#C26B3E",
  secondaryDeep: "#A1532C",
  gold: "#D6A23B",
  goldSoft: "#F2E2B8",
  radius: "12px",
  fonts: {
    display: "Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..600",
    body: "Hanken+Grotesk:wght@400;500;600;700",
  },
};

export const THEMES: Record<string, Theme> = {
  sand: { name: "sand", tokens: sand },
  midnight: { name: "midnight", tokens: midnight },
  coast: { name: "coast", tokens: coast },
};

export const DEFAULT_THEME = "sand";

/** Resolve a theme name or inline partial token set into full tokens. */
export function resolveTheme(theme?: string | Partial<ThemeTokens>): ThemeTokens {
  if (!theme) return THEMES[DEFAULT_THEME]!.tokens;
  if (typeof theme === "string") {
    const t = THEMES[theme];
    if (!t) throw new Error(`Unknown theme "${theme}". Known: ${Object.keys(THEMES).join(", ")}`);
    return t.tokens;
  }
  // Inline overrides merge onto the default base.
  return { ...THEMES[DEFAULT_THEME]!.tokens, ...theme, fonts: { ...THEMES[DEFAULT_THEME]!.tokens.fonts, ...theme.fonts } };
}
