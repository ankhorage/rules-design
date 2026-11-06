import { isDeepStrictEqual } from 'node:util';

import type { JsonValue } from '@ankhorage/rules';

/*** Provides shared primitive checks for normalized Color observation fields. */
export const colorObservationValues = {
  sequence: (left: readonly string[], right: readonly string[]): boolean =>
    isDeepStrictEqual(left, right),
  strings: (value: JsonValue | undefined): readonly string[] | undefined =>
    Array.isArray(value) && value.length > 0 && value.every(colorObservationValues.text)
      ? value
      : undefined,
  text: (value: unknown): value is string => typeof value === 'string' && value.trim() !== '',
};
