import type { JsonValue } from '@ankhorage/rules';
import { isRecord } from '@ankhorage/utility/object';

/*** Verifies the complete observation shape required by one frozen Contrast rule. */
export function hasValidContrastMeasurement(
  id: string,
  value: Readonly<Record<string, JsonValue>>,
): boolean {
  const validator = measurementValidators.get(id);
  return validator?.(value) === true;
}

const measurementValidators = new Map<
  string,
  (value: Readonly<Record<string, JsonValue>>) => boolean
>([
  [
    'design.contrast.cta-prominence',
    (value) => number(value.primaryProminence) && number(value.competingProminence),
  ],
  [
    'design.contrast.focus-visible',
    (value) =>
      number(value.contrastRatio) &&
      typeof value.focusIndicatorVisible === 'boolean' &&
      text(value.effectiveBackground),
  ],
  [
    'design.contrast.link-distinction',
    (value) =>
      number(value.distinguishingContrastRatio) && typeof value.nonColorCueVisible === 'boolean',
  ],
  ['design.contrast.nontext-ratio', hasColorRatio],
  [
    'design.contrast.state-distinction',
    (value) =>
      number(value.contrastRatio) &&
      text(value.state) &&
      text(value.comparedState) &&
      value.state !== value.comparedState,
  ],
  [
    'design.contrast.surface-separation',
    (value) =>
      number(value.contrastRatio) &&
      text(value.firstEffectiveBackground) &&
      text(value.secondEffectiveBackground),
  ],
  [
    'design.contrast.text-background-resolved',
    (value) =>
      text(value.effectiveBackground) &&
      Number.isInteger(value.backgroundLayerCount) &&
      Number(value.backgroundLayerCount) > 0,
  ],
  ['design.contrast.text-ratio', hasColorRatio],
  ['design.contrast.visual-hierarchy', (value) => isEmphasis(value.emphasis)],
]);

/*** Validates a complete foreground-to-effective-background contrast measurement. */
function hasColorRatio(value: Readonly<Record<string, JsonValue>>): boolean {
  return number(value.contrastRatio) && text(value.effectiveBackground) && text(value.foreground);
}

/*** Narrows ordered hierarchy entries to finite observed emphasis scores. */
function isEmphasis(value: JsonValue | undefined): value is readonly { readonly score: number }[] {
  return (
    isJsonValueArray(value) &&
    value.length > 1 &&
    value.every((entry) => isRecord(entry) && number(entry.score))
  );
}

/*** Narrows a JSON value to an immutable sequence of JSON values. */
function isJsonValueArray(value: JsonValue | undefined): value is readonly JsonValue[] {
  return Array.isArray(value);
}

/*** Checks finite non-negative numeric observations. */
function number(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/*** Checks non-empty textual observations. */
function text(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}
