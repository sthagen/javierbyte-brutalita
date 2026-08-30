export type CharLayer = [number, number][];
export type CharLayers = CharLayer[];

// Editor grid resolution: 2 columns x 4 rows of segments.
export const SEGMENTS = [2, 4] as const;

/**
 * OS/2 usWeightClass: any integer in 1..1000, not a fixed set. Stroke
 * thickness and style name are derived from it in src/weights.ts.
 */
export type FontWeightType = number;

export type FontConfig = {
  name: string;
  weight: FontWeightType;
  height: number;
  monospace: boolean;
  designer?: string;
  designerURL?: string;
  /**
   * Overrides the subfamily name derived from `weight` ("Regular", "Bold",
   * or the number itself for a weight with no standard name).
   */
  styleName?: string;
  /**
   * Release number of the typeface ("0.8"). Written to OpenType name ID 5 as
   * "Version 0.8". The family name has to stay stable across releases or
   * documents using the font break, so the version lives here rather than in
   * `name`. Omitted for user fonts.
   */
  version?: string;
};

export type FontDefinition = {
  [char: string]: CharLayers;
};
