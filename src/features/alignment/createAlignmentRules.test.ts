import { evaluateRules } from '@ankhorage/rules';
import { expect, test } from 'bun:test';

import { alignmentMetricFact } from '../../../test/fixtures/alignmentMetricFact';
import { createAlignmentRules } from './createAlignmentRules';

const scope = { id: 'page:landing', kind: 'page' };
const capabilities = ['dom.layout', 'viewport.layout', 'rendered.area-analysis'];
const measurementsByRuleId: Readonly<Record<string, string>> = {
  'design.alignment.shared-edges': 'edge-offset',
  'design.alignment.grid-tracks': 'grid-track-offset',
  'design.alignment.baselines': 'baseline-offset',
  'design.alignment.text': 'text-alignment-offset',
  'design.alignment.flex-items': 'flex-alignment-offset',
  'design.alignment.component-axes': 'component-axis-offset',
  'design.layout.container-width': 'container-width-deviation',
  'design.layout.grid-gap': 'grid-gap-deviation',
  'design.layout.horizontal-overflow': 'horizontal-overflow',
  'design.layout.vertical-clipping': 'vertical-clipping',
  'design.layout.unintended-overlap': 'overlap-area',
  'design.layout.unnecessary-wrapper': 'avoidable-wrapper-count',
  'design.layout.visual-balance': 'visual-weight-imbalance',
} as const;

test('creates exactly the frozen Alignment and Layout rules with explicit capabilities', () => {
  const rules = createAlignmentRules();
  expect(rules.map((rule) => rule.identity.id)).toEqual([
    'design.alignment.shared-edges',
    'design.alignment.grid-tracks',
    'design.alignment.baselines',
    'design.alignment.text',
    'design.alignment.flex-items',
    'design.alignment.component-axes',
    'design.layout.container-width',
    'design.layout.grid-gap',
    'design.layout.horizontal-overflow',
    'design.layout.vertical-clipping',
    'design.layout.unintended-overlap',
    'design.layout.unnecessary-wrapper',
    'design.layout.visual-balance',
  ]);
  expect(
    rules.find((rule) => rule.identity.id === 'design.layout.horizontal-overflow')
      ?.requiredCapabilities,
  ).toEqual(['viewport.layout']);
  expect(
    rules.find((rule) => rule.identity.id === 'design.layout.visual-balance')?.requiredCapabilities,
  ).toEqual(['rendered.area-analysis']);
  expect(
    Object.fromEntries(
      rules.map((rule) => [
        rule.identity.id,
        rule.facets?.find((facet) => facet.id === 'measurement')?.value,
      ]),
    ),
  ).toEqual(measurementsByRuleId);
});

test.each(createAlignmentRules())(
  '$identity.id passes with a metric inside its tolerance',
  (rule) => {
    const result = evaluateRules(
      {
        facts: [alignmentMetricFact(rule.identity.id, scope.id, measurementFor(rule), 10, 10.5, 1)],
      },
      [rule],
      { capabilities, scope },
    );
    expect(result.results[0]?.status).toBe('PASS');
    expect(result.findings).toEqual([]);
  },
);

test.each(createAlignmentRules())(
  '$identity.id reports the measured deviation outside tolerance',
  (rule) => {
    const result = evaluateRules(
      {
        facts: [alignmentMetricFact(rule.identity.id, scope.id, measurementFor(rule), 10, 12, 1)],
      },
      [rule],
      { capabilities, scope },
    );
    expect(result.results[0]).toMatchObject({ status: 'FAIL' });
    expect(result.findings[0]).toMatchObject({
      evidence: { deviation: 2, expected: 10, observed: 12, tolerance: 1 },
      ruleId: rule.identity.id,
    });
  },
);

test.each(createAlignmentRules())(
  '$identity.id is incomplete without its scoped metric',
  (rule) => {
    const result = evaluateRules({ facts: [] }, [rule], { capabilities, scope });
    expect(result.results[0]).toMatchObject({ status: 'INCOMPLETE' });
    expect(result.findings[0]).toMatchObject({
      evidence: { scopeId: scope.id },
      ruleId: rule.identity.id,
    });
  },
);

test('does not use a metric from another scope as passing evidence', () => {
  const [rule] = createAlignmentRules();
  const result = evaluateRules(
    {
      facts: [alignmentMetricFact(rule.identity.id, 'page:other', measurementFor(rule), 10, 10, 1)],
    },
    [rule],
    { capabilities, scope },
  );
  expect(result.results[0]?.status).toBe('INCOMPLETE');
});

test('does not use a metric from another scope kind as passing evidence', () => {
  const [rule] = createAlignmentRules();
  const fact = alignmentMetricFact(rule.identity.id, scope.id, measurementFor(rule), 10, 10, 1);
  const result = evaluateRules(
    { facts: [{ ...fact, scope: { ...fact.scope, kind: 'component' } }] },
    [rule],
    { capabilities, scope },
  );
  expect(result.results[0]?.status).toBe('INCOMPLETE');
});

test('returns INCOMPLETE for invalid normalized metric values', () => {
  const [rule] = createAlignmentRules();
  const fact = alignmentMetricFact(rule.identity.id, scope.id, measurementFor(rule), 10, 12, 1);
  const invalidMetrics = [
    { ...fact.value, expected: Number.NaN },
    { ...fact.value, observed: Number.POSITIVE_INFINITY },
    { ...fact.value, tolerance: -1 },
    { ...fact.value, subjectIds: [] },
    { ...fact.value, subjectIds: [''] },
    { ...fact.value, subjectIds: ['fixture-subject', 1] },
    { ...fact.value, subjectIds: ['fixture-subject', 'fixture-subject'] },
    { ...fact.value, measurement: 'unrelated-measurement' },
  ];

  for (const value of invalidMetrics) {
    const result = evaluateRules({ facts: [{ ...fact, value }] }, [rule], { capabilities, scope });
    expect(result.results[0]?.status).toBe('INCOMPLETE');
  }
});

test('passes exactly at the tolerance boundary', () => {
  const [rule] = createAlignmentRules();
  const result = evaluateRules(
    {
      facts: [alignmentMetricFact(rule.identity.id, scope.id, measurementFor(rule), 10, 11, 1)],
    },
    [rule],
    { capabilities, scope },
  );
  expect(result.results[0]?.status).toBe('PASS');
});

test('returns INCOMPLETE when a duplicate fact is missing or contradictory', () => {
  const [rule] = createAlignmentRules();
  const fact = alignmentMetricFact(rule.identity.id, scope.id, measurementFor(rule), 10, 12, 1);
  const { value: _value, ...factWithoutValue } = fact;
  const missingFact = {
    ...factWithoutValue,
    id: `${fact.id}:missing`,
    missing: { code: 'unavailable', message: 'The other measurement was unavailable.' },
    status: 'missing' as const,
  };
  const contradictoryFact = {
    ...fact,
    id: `${fact.id}:contradictory`,
    value: { ...fact.value, observed: 10 },
  };

  for (const additionalFact of [missingFact, contradictoryFact]) {
    const result = evaluateRules({ facts: [fact, additionalFact] }, [rule], {
      capabilities,
      scope,
    });
    expect(result.results[0]?.status).toBe('INCOMPLETE');
  }
});

function measurementFor(rule: {
  readonly facets?: readonly { readonly id: string; readonly value: string }[];
}): string {
  const measurement = rule.facets?.find((facet) => facet.id === 'measurement')?.value;
  if (!measurement) throw new Error('Alignment rule has no measurement facet.');
  return measurement;
}
