/** One normalized, provider-neutral rendered Typography observation. */
export interface TypographyObservation {
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
