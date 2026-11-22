import type { JsonValue } from '@ankhorage/rules';
import { arraysEqual } from '@ankhorage/utility/array';

/*** Provides shared primitive checks for normalized Color observation fields. */
export const colorObservationValues = {
  sequence: (left: readonly string[], right: readonly string[]): boolean =>
    arraysEqual(left, right),
  strings: (value: JsonValue | undefined): readonly string[] | undefined =>
    Array.isArray(value) && value.length > 0 && value.every(colorObservationValues.text)
      ? value
      : undefined,
  text: (value: unknown): value is string => typeof value === 'string' && value.trim() !== '',
};
