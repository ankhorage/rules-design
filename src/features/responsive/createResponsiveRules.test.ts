import { evaluateRules } from '@ankhorage/rules';
import { expect, test } from 'bun:test';

import {
  completeResponsiveFact,
  failingResponsiveFact,
} from '../../../test/fixtures/responsiveFact';
import { createResponsiveRules } from './createResponsiveRules';

const rules = createResponsiveRules();
const capabilities = ['viewport.layout', 'viewport.matrix'];

test('evaluates every responsive rule from complete browser and DOM measurements', () => {
  const result = evaluateRules({ facts: [completeResponsiveFact()] }, rules, { capabilities });

  expect(result.results).toHaveLength(10);
  expect(result.results.every((entry) => entry.status === 'PASS')).toBe(true);
});

test('fails every responsive rule with its precise measured counterexample', () => {
  const result = evaluateRules({ facts: [failingResponsiveFact()] }, rules, { capabilities });

  expect(result.results.map((entry) => [entry.rule.id, entry.status])).toEqual([
    ['design.responsive.breakpoint-coverage', 'FAIL'],
    ['design.responsive.fixed-dimensions', 'FAIL'],
    ['design.responsive.horizontal-overflow', 'FAIL'],
    ['design.responsive.image-crop', 'FAIL'],
    ['design.responsive.order', 'FAIL'],
    ['design.responsive.orientation', 'INCOMPLETE'],
    ['design.responsive.reflow', 'FAIL'],
    ['design.responsive.text-wrap', 'FAIL'],
    ['design.responsive.touch-target', 'FAIL'],
    ['design.responsive.zoom-reflow', 'FAIL'],
  ]);
  expect(result.findings.every((finding) => finding.message.length > 0)).toBe(true);
});

test('keeps every responsive rule incomplete when the required capabilities are unavailable', () => {
  const result = evaluateRules({ facts: [completeResponsiveFact()] }, rules);

  expect(result.results.every((entry) => entry.status === 'INCOMPLETE')).toBe(true);
  expect(result.diagnostics).toHaveLength(20);
});

test('keeps every responsive rule incomplete when browser or DOM facts are missing', () => {
  const result = evaluateRules({ facts: [] }, rules, { capabilities });

  expect(result.results.every((entry) => entry.status === 'INCOMPLETE')).toBe(true);
  expect(result.findings.every((finding) => finding.message.includes('unavailable'))).toBe(true);
});
