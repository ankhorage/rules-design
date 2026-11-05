import { evaluateRules } from '@ankhorage/rules';
import { expect, test } from 'bun:test';

import {
  completeResponsiveFact,
  failingResponsiveFact,
} from '../../../test/fixtures/responsiveFact';
import { createResponsiveRules } from './createResponsiveRules';

const rules = createResponsiveRules();
const capabilities = ['viewport.layout', 'viewport.matrix'];
const scope = { id: 'page:/fixture', kind: 'page' };

test('evaluates every responsive rule from complete browser and DOM measurements', () => {
  const result = evaluateRules({ facts: [completeResponsiveFact()] }, rules, {
    capabilities,
    scope,
  });

  expect(result.results).toHaveLength(10);
  expect(result.results.every((entry) => entry.status === 'PASS')).toBe(true);
});

test('fails every responsive rule with its precise measured counterexample', () => {
  const result = evaluateRules({ facts: [failingResponsiveFact()] }, rules, {
    capabilities,
    scope,
  });

  expect(result.results.map((entry) => [entry.rule.id, entry.status])).toEqual([
    ['design.responsive.breakpoint-coverage', 'PASS'],
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
  const result = evaluateRules({ facts: [completeResponsiveFact()] }, rules, { scope });

  expect(result.results.every((entry) => entry.status === 'INCOMPLETE')).toBe(true);
  expect(result.diagnostics).toHaveLength(20);
});

test('keeps every responsive rule incomplete when browser or DOM facts are missing', () => {
  const result = evaluateRules({ facts: [] }, rules, { capabilities, scope });

  expect(result.results.every((entry) => entry.status === 'INCOMPLETE')).toBe(true);
  expect(result.findings.every((finding) => finding.message.includes('unavailable'))).toBe(true);
});

test('keeps every responsive rule incomplete for facts outside the exact evaluation scope', () => {
  const fact = completeResponsiveFact();
  const result = evaluateRules(
    { facts: [{ ...fact, scope: { ...fact.scope, id: 'page:/other' } }] },
    rules,
    { capabilities, scope },
  );

  expect(result.results.every((entry) => entry.status === 'INCOMPLETE')).toBe(true);
});

test('keeps every responsive rule incomplete when a declared breakpoint has no viewport evidence', () => {
  const fact = completeResponsiveFact();
  const result = evaluateRules(
    {
      facts: [
        {
          ...fact,
          value: { ...fact.value, requiredBreakpointIds: ['mobile', 'tablet', 'desktop'] },
        },
      ],
    },
    rules,
    { capabilities, scope },
  );

  expect(result.results.every((entry) => entry.status === 'INCOMPLETE')).toBe(true);
});

test('rejects non-finite geometry, zoom, and dimensions as incomplete evidence', () => {
  const fact = completeResponsiveFact();
  for (const value of [NaN, Infinity]) {
    const [viewport] = fact.value.viewports;
    const result = evaluateRules(
      {
        facts: [
          {
            ...fact,
            value: {
              ...fact.value,
              minimumTouchTarget: value,
              viewports: [
                {
                  ...viewport,
                  size: { ...viewport.size, width: value },
                  zoom: value,
                },
              ],
            },
          },
        ],
      },
      rules,
      { capabilities, scope },
    );

    expect(result.results.every((entry) => entry.status === 'INCOMPLETE')).toBe(true);
  }
});

test('derives responsive verdicts from measurements instead of adapter verdict flags', () => {
  const fact = completeResponsiveFact();
  const [firstViewport, secondViewport] = fact.value.viewports;
  const result = evaluateRules(
    {
      facts: [
        {
          ...fact,
          value: {
            ...fact.value,
            viewports: [
              {
                ...firstViewport,
                layout: { renderedWidth: 400, scrollWidth: 400 },
                reflowed: true,
                zoomReflowed: true,
              },
              secondViewport,
            ],
          },
        },
      ],
    },
    rules,
    { capabilities, scope },
  );

  expect(result.results.find((entry) => entry.rule.id === 'design.responsive.reflow')?.status).toBe(
    'FAIL',
  );
  expect(
    result.results.find((entry) => entry.rule.id === 'design.responsive.horizontal-overflow')
      ?.status,
  ).toBe('FAIL');
});
