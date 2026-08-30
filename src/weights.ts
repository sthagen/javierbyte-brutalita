// Everything the codebase knows about a font weight. A weight is a number and a
// stroke thickness — nothing else — so a new one is data here, not code
// elsewhere. Kept free of opentype.js and the DOM: the browser editor, the SVG
// exporter, the validator and the CLI all import it.

import type { FontWeightType } from './types';

/** OS/2 usWeightClass is a uint16 the spec restricts to 1..1000. */
export const MIN_WEIGHT = 1;
export const MAX_WEIGHT = 1000;

/**
 * The hand-tuned thickness anchors, ascending. Weights between two stops
 * interpolate; weights outside the range draw at the nearest stop's thickness
 * (a 100 looks like a Light but still writes usWeightClass 100). Widening the
 * range is one more entry here.
 */
const STOPS = [
  { weight: 300, stroke: 0.15, editorStroke: 1.5 },
  { weight: 400, stroke: 0.25, editorStroke: 2 },
  { weight: 700, stroke: 0.3, editorStroke: 2.5 },
] as const;

type StopKey = 'stroke' | 'editorStroke';

// Written as a * (1 - t) + b * t rather than a + (b - a) * t so that landing
// exactly on a stop returns that stop's value bit-for-bit — the committed .otf
// files and brutalita-cover.svg are compared byte for byte in the tests.
function interpolate(weight: number, key: StopKey): number {
  const first = STOPS[0];
  const last = STOPS[STOPS.length - 1];
  if (weight <= first.weight) return first[key];
  if (weight >= last.weight) return last[key];

  for (let i = 1; i < STOPS.length; i++) {
    const a = STOPS[i - 1];
    const b = STOPS[i];
    if (weight > b.weight) continue;

    const t = (weight - a.weight) / (b.weight - a.weight);
    return a[key] * (1 - t) + b[key] * t;
  }

  return last[key];
}

/** Stroke half-width in grid units, for the .otf outline expansion. */
export function strokeFraction(weight: FontWeightType): number {
  return interpolate(weight, 'stroke');
}

/** Stroke width in px, for the editor preview and the .svg export. */
export function editorStrokeWidth(weight: FontWeightType): number {
  return interpolate(weight, 'editorStroke');
}

/** The OpenType subfamily names, for the weights that have one. */
const STANDARD_STYLE_NAMES: Record<number, string> = {
  100: 'Thin',
  200: 'ExtraLight',
  300: 'Light',
  400: 'Regular',
  500: 'Medium',
  600: 'SemiBold',
  700: 'Bold',
  800: 'ExtraBold',
  900: 'Black',
};

/**
 * The subfamily name a config builds under, used for the OpenType name table
 * and the default filename. A weight without a standard name is named after
 * itself ("Brutalita-550.otf") so two weights can never collide.
 */
export function styleName(config: {
  weight: FontWeightType;
  styleName?: string;
}): string {
  const override = config.styleName?.trim();
  if (override) return override;
  return STANDARD_STYLE_NAMES[config.weight] ?? String(config.weight);
}

/**
 * Coerce a user-supplied weight — a number, or the string form of one — to an
 * integer in range. Returns null when it is not a weight at all, leaving the
 * caller to decide between a warning, a fallback and an error.
 */
export function parseWeight(value: unknown): FontWeightType | null {
  const weight = Math.round(Number(value));
  if (!Number.isFinite(weight)) return null;
  if (weight < MIN_WEIGHT || weight > MAX_WEIGHT) return null;
  return weight;
}

/**
 * The weights brutalita.com publishes and the editor offers, and what
 * `brutalita build --weight all` expands to. Any other weight still builds —
 * this list is what ships, not what is allowed.
 */
export const SHIPPED_WEIGHTS: FontWeightType[] = [300, 400, 500, 700];
