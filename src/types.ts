export type CharLayer = [number, number][];
export type CharLayers = CharLayer[];

// Editor grid resolution: 2 columns x 4 rows of segments.
export const SEGMENTS = [2, 4] as const;

export type FontWeightType = 300 | 400 | 500 | 700;

export type FontConfig = {
  name: string;
  weight: FontWeightType;
  height: number;
  monospace: boolean;
  designer?: string;
  designerURL?: string;
  /**
   * Release number of the typeface, conventionally three decimals ("0.800").
   * Written to OpenType name ID 5 as "Version 0.800". The family name has to
   * stay stable across releases or documents using the font break, so the
   * version lives here rather than in `name`. Omitted for user fonts.
   */
  version?: string;
};

export type FontDefinition = {
  [char: string]: CharLayers;
};
