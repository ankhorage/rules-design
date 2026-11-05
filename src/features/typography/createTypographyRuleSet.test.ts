import type { FactEnvelope } from '@ankhorage/contracts/rules';
import { evaluateRules } from '@ankhorage/rules';
import { expect, test } from 'bun:test';

import {
  h1Observation,
  malformedFact,
  missingFact,
  observation,
  observations,
  typographyPolicy,
} from '../../../test/fixtures/typographyRuleFacts.ts';
import { createTypographyRuleSet, type TypographyRulePolicy } from './createTypographyRuleSet.ts';

const capabilities = ['design.heading-facts', 'design.typography-facts'];
const evaluationOptions = { capabilities, scope: { id: 'page', kind: 'page' } };
const policy: TypographyRulePolicy = typographyPolicy;
const ruleSet = createTypographyRuleSet(policy);

test('passes every Typography and Heading rule with valid normalized facts', () => {
  const result = evaluateRules(context(observations()), ruleSet.rules, evaluationOptions);

  expect(result.diagnostics).toEqual([]);
  expect(result.findings).toEqual([]);
  expect(result.results.map((entry) => [entry.rule.id, entry.status])).toEqual([
    ['design.heading.h1-count', 'PASS'],
    ['design.heading.h1-presence', 'PASS'],
    ['design.heading.level-order', 'PASS'],
    ['design.heading.semantic-style', 'PASS'],
    ['design.heading.spacing-after', 'PASS'],
    ['design.heading.spacing-before', 'PASS'],
    ['design.heading.text-clipping', 'PASS'],
    ['design.typography.body-minimum', 'PASS'],
    ['design.typography.font-family', 'PASS'],
    ['design.typography.letter-spacing', 'PASS'],
    ['design.typography.line-height', 'PASS'],
    ['design.typography.paragraph-measure', 'PASS'],
    ['design.typography.responsive-scale', 'PASS'],
    ['design.typography.scale', 'PASS'],
    ['design.typography.weight', 'PASS'],
  ]);
});

test.each([
  ['design.typography.font-family', observation('body', { fontFamily: 'Unapproved' })],
  ['design.typography.scale', observation('body', { fontSize: 17 })],
  ['design.typography.weight', observation('body', { fontWeight: '500' })],
  ['design.typography.line-height', observation('body', { lineHeight: 21 })],
  ['design.typography.letter-spacing', observation('body', { letterSpacing: 1 })],
  ['design.typography.paragraph-measure', observation('body', { paragraphMeasure: 80 })],
  ['design.typography.body-minimum', observation('body', { fontSize: 15 })],
  ['design.typography.responsive-scale', observation('body', { responsiveRole: 'unknown' })],
  [
    'design.heading.h1-presence',
    observation('h1', { headingLevel: 2, semanticStyle: 'section', responsiveRole: 'section' }),
  ],
  [
    'design.heading.h1-count',
    observation('h2', { headingLevel: 1, semanticStyle: 'display', responsiveRole: 'hero' }),
  ],
  [
    'design.heading.level-order',
    observation('h2', { headingLevel: 3, semanticStyle: 'section', responsiveRole: 'section' }),
  ],
  ['design.heading.semantic-style', observation('h1', { semanticStyle: 'section' })],
  ['design.heading.spacing-before', observation('h1', { marginBefore: 12 })],
  ['design.heading.spacing-after', observation('h1', { marginAfter: 12 })],
  ['design.heading.text-clipping', observation('h1', { textClipped: true })],
] as const)('fails %s when its measured policy condition is violated', (ruleId, replacement) => {
  const result = evaluateRules(
    context(observations(replacement)),
    ruleSet.rules,
    evaluationOptions,
  );
  const ruleResult = result.results.find((entry) => entry.rule.id === ruleId);

  expect(ruleResult).toMatchObject({ status: 'FAIL' });
  expect(ruleResult?.findings).toHaveLength(1);
  expect(ruleResult?.findings[0]).toMatchObject({
    ruleId,
  });
});

test('marks every rule incomplete when normalized evidence is absent', () => {
  const result = evaluateRules(context([]), ruleSet.rules, evaluationOptions);

  expect(result.diagnostics).toEqual([]);
  expect(result.results.every((entry) => entry.status === 'INCOMPLETE')).toBe(true);
  expect(result.findings).toHaveLength(15);
  expect(result.findings.every((finding) => finding.message.includes('evidence is missing'))).toBe(
    true,
  );
});

test.each([
  ['Typography', 'design.typography-facts', missingFact('body')],
  ['Heading', 'design.heading-facts', missingFact('h1')],
  ['Typography', 'design.typography-facts', malformedFact('body')],
  ['Heading', 'design.heading-facts', malformedFact('h1')],
] as const)(
  'fails closed for mixed valid and incomplete %s evidence',
  (_, capability, incompleteFact) => {
    const result = evaluateRules(
      context([...observations(), incompleteFact]),
      ruleSet.rules,
      evaluationOptions,
    );
    const rulePrefix =
      capability === 'design.typography-facts' ? 'design.typography.' : 'design.heading.';
    const groupResults = result.results.filter((entry) => entry.rule.id.startsWith(rulePrefix));

    expect(groupResults.every((entry) => entry.status === 'INCOMPLETE')).toBe(true);
  },
);

test.each([
  ['design.typography.font-family', 'body'],
  ['design.typography.scale', 'body'],
  ['design.typography.weight', 'body'],
  ['design.typography.line-height', 'body'],
  ['design.typography.letter-spacing', 'body'],
  ['design.typography.paragraph-measure', 'body'],
  ['design.typography.body-minimum', 'body'],
  ['design.typography.responsive-scale', 'body'],
  ['design.heading.h1-presence', 'h1'],
  ['design.heading.h1-count', 'h1'],
  ['design.heading.level-order', 'h1'],
  ['design.heading.semantic-style', 'h1'],
  ['design.heading.spacing-before', 'h1'],
  ['design.heading.spacing-after', 'h1'],
  ['design.heading.text-clipping', 'h1'],
] as const)('marks %s incomplete when its required measurement fact is missing', (ruleId, id) => {
  const result = evaluateRules(context([missingFact(id)]), ruleSet.rules, evaluationOptions);
  const ruleResult = result.results.find((entry) => entry.rule.id === ruleId);

  expect(ruleResult).toMatchObject({ status: 'INCOMPLETE' });
});

test('requires the exact FactEnvelope scope ID and kind', () => {
  const facts = observations().map((value) => ({
    ...value,
    scope: { ...value.scope, id: 'another-page' },
  }));
  const result = evaluateRules(context(facts), ruleSet.rules, evaluationOptions);

  expect(result.results.every((entry) => entry.status === 'INCOMPLETE')).toBe(true);
});

test('keeps heading counts and hierarchy separate for each responsive viewport', () => {
  const facts = [
    observation('h2', { documentOrder: 2 }),
    observation('h1', { documentOrder: 1 }),
    observation('h1', { documentOrder: 1, viewport: 'mobile' }),
    observation('h2', { documentOrder: 2, viewport: 'mobile' }),
  ];
  const result = evaluateRules(context(facts), ruleSet.rules, evaluationOptions);
  const statuses = result.results
    .filter(
      (entry) =>
        entry.rule.id === 'design.heading.h1-count' ||
        entry.rule.id === 'design.heading.level-order',
    )
    .map((entry) => entry.status);

  expect(statuses).toEqual(['PASS', 'PASS']);
});

test.each([
  [1, 2],
  [2, 3],
  [3, 4],
] as const)(
  'reports only H1 observations beyond the configured maximum of %i',
  (maximumH1Count, h1Count) => {
    const facts = Array.from({ length: h1Count }, (_, index) => h1Observation(index + 1));
    const result = evaluateRules(
      context(facts),
      createTypographyRuleSet({ ...policy, maximumH1Count }).rules,
      evaluationOptions,
    );
    const ruleResult = result.results.find((entry) => entry.rule.id === 'design.heading.h1-count');

    expect(ruleResult).toMatchObject({ status: 'FAIL' });
    expect(ruleResult?.findings.map((finding) => finding.evidence)).toEqual(
      Array.from({ length: h1Count - maximumH1Count }, (_, index) => ({
        observationId: `h1-${maximumH1Count + index + 1}`,
        viewport: 'desktop',
      })),
    );
  },
);

test('reports excess H1 observations by document order when FactEnvelope input is shuffled', () => {
  const facts = [h1Observation(4), h1Observation(1), h1Observation(3), h1Observation(2)];
  const result = evaluateRules(
    context(facts),
    createTypographyRuleSet({ ...policy, maximumH1Count: 2 }).rules,
    evaluationOptions,
  );
  const ruleResult = result.results.find((entry) => entry.rule.id === 'design.heading.h1-count');

  expect(ruleResult).toMatchObject({ status: 'FAIL' });
  expect(ruleResult?.findings.map((finding) => finding.evidence)).toEqual([
    { observationId: 'h1-3', viewport: 'desktop' },
    { observationId: 'h1-4', viewport: 'desktop' },
  ]);
});

test('rejects malformed policy configuration before evaluation', () => {
  expect(() =>
    createTypographyRuleSet({ ...policy, maximumH1Count: 0, minimumH1Count: 1 }),
  ).toThrow('Typography rule policy must contain complete, internally consistent measurements.');
});

test('declares group-specific capabilities instead of treating missing browser facts as a pass', () => {
  const result = evaluateRules(context(observations()), ruleSet.rules, {
    capabilities: [],
    scope: evaluationOptions.scope,
  });

  expect(result.findings).toEqual([]);
  expect(result.diagnostics).toHaveLength(15);
  expect(result.diagnostics.every((diagnostic) => diagnostic.code === 'missing-capability')).toBe(
    true,
  );
});

function context(facts: readonly FactEnvelope[]) {
  return { evidence: [], facts };
}
