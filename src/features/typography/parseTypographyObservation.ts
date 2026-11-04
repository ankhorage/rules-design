import { isRecord } from '@ankhorage/utility/object';

import type { TypographyObservation } from '../../types/typography';

/*** Parses one available serialized fact into a normalized Typography observation. */
export function parseTypographyObservation(
  value: unknown,
  id: string,
): readonly TypographyObservation[] {
  if (
    !isRecord(value) ||
    !isString(value.fontFamily) ||
    !isNumber(value.fontSize) ||
    !isString(value.fontWeight) ||
    !isNumber(value.letterSpacing) ||
    !isNumber(value.lineHeight) ||
    !isString(value.viewport)
  )
    return [];
  const headingLevel = nullableHeadingLevel(value.headingLevel);
  if (value.headingLevel !== undefined && headingLevel === undefined) return [];
  return [
    {
      fontFamily: value.fontFamily,
      fontSize: value.fontSize,
      fontWeight: value.fontWeight,
      headingLevel: headingLevel ?? null,
      id,
      letterSpacing: value.letterSpacing,
      lineHeight: value.lineHeight,
      marginAfter: nullableNumber(value.marginAfter),
      marginBefore: nullableNumber(value.marginBefore),
      paragraphMeasure: nullableNumber(value.paragraphMeasure),
      responsiveRole: nullableString(value.responsiveRole),
      semanticStyle: nullableString(value.semanticStyle),
      textClipped: nullableBoolean(value.textClipped),
      viewport: value.viewport,
    },
  ];
}

/*** Narrows an unknown serialized value to a finite number. */
function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/*** Narrows an optional serialized value to a nullable boolean. */
function nullableBoolean(value: unknown): boolean | null {
  return value === undefined || value === null ? null : typeof value === 'boolean' ? value : null;
}

/*** Narrows an optional serialized value to a valid nullable heading level. */
function nullableHeadingLevel(value: unknown): number | null | undefined {
  return value === undefined || value === null
    ? null
    : isNumber(value) && Number.isInteger(value) && value >= 1 && value <= 6
      ? value
      : undefined;
}

/*** Narrows an optional serialized value to a nullable finite number. */
function nullableNumber(value: unknown): number | null {
  return value === undefined || value === null ? null : isNumber(value) ? value : null;
}

/*** Narrows an optional serialized value to a nullable string. */
function nullableString(value: unknown): string | null {
  return value === undefined || value === null ? null : isString(value) ? value : null;
}

/*** Narrows an unknown serialized value to a string. */
function isString(value: unknown): value is string {
  return typeof value === 'string';
}
