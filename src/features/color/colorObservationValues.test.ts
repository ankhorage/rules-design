import type { JsonValue } from '@ankhorage/rules';
import { expect, test } from 'bun:test';

import { colorObservationValues } from './colorObservationValues';

test('compares normalized token sequences exactly and in order', () => {
  expect(colorObservationValues.sequence(['blue/100', 'blue/500'], ['blue/100', 'blue/500'])).toBe(
    true,
  );
  expect(colorObservationValues.sequence(['blue/100', 'blue/500'], ['blue/500', 'blue/100'])).toBe(
    false,
  );
  expect(colorObservationValues.sequence(['blue/100'], ['blue/500'])).toBe(false);
});
test('rejects invalid token-sequence observations before equality evaluation', () => {
  expect(colorObservationValues.strings([])).toBeUndefined();
  expect(colorObservationValues.strings(['blue/100', ''])).toBeUndefined();
  expect(colorObservationValues.strings(['blue/100', '   '])).toBeUndefined();
  expect(colorObservationValues.strings(['blue/100', 500] satisfies JsonValue)).toBeUndefined();
});
