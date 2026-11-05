/** One normalized, provider-neutral rendered Typography observation. */
export interface TypographyObservation {
  readonly documentOrder: number | null;
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly fontWeight: string;
  readonly headingLevel: number | null;
  readonly id: string;
  readonly letterSpacing: number;
  readonly lineHeight: number;
  readonly marginAfter: number | null;
  readonly marginBefore: number | null;
  readonly paragraphMeasure: number | null;
  readonly responsiveRole: string | null;
  readonly semanticStyle: string | null;
  readonly textClipped: boolean | null;
  readonly viewport: string;
}

/** Explicit allow-lists and thresholds used to evaluate Typography observations. */
export interface TypographyRulePolicy {
  readonly allowedFontFamilies: readonly string[];
  readonly allowedFontSizes: readonly number[];
  readonly allowedFontWeights: readonly string[];
  readonly allowedLetterSpacings: readonly number[];
  readonly allowedLineHeights: readonly number[];
  readonly allowedSemanticStyles: Readonly<Record<string, readonly string[]>>;
  readonly allowedSpacingAfter: readonly number[];
  readonly allowedSpacingBefore: readonly number[];
  readonly maximumH1Count: number;
  readonly maximumParagraphMeasure: number;
  readonly minimumBodyFontSize: number;
  readonly minimumH1Count: number;
  readonly minimumParagraphMeasure: number;
  readonly responsiveFontSizes: Readonly<Record<string, readonly number[]>>;
}
