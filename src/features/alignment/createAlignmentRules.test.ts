import { evaluateRules } from '@ankhorage/rules';
import { expect, test } from 'bun:test';

import { alignmentMetricFact } from '../../../test/fixtures/alignmentMetricFact';
import { createAlignmentRules } from './createAlignmentRules';

const scope = { id: 'page:landing', kind: 'page' };
const capabilities = ['dom.layout', 'viewport.layout', 'rendered.area-analysis'];

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
});

test.each(createAlignmentRules())(
  '$identity.id passes with a metric inside its tolerance',
  (rule) => {
    const result = evaluateRules(
      { facts: [alignmentMetricFact(rule.identity.id, scope.id, 10, 10.5, 1)] },
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
      { facts: [alignmentMetricFact(rule.identity.id, scope.id, 10, 12, 1)] },
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
    { facts: [alignmentMetricFact(rule.identity.id, 'page:other', 10, 10, 1)] },
    [rule],
    { capabilities, scope },
  );
  expect(result.results[0]?.status).toBe('INCOMPLETE');
});
