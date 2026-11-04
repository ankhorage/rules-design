import { evaluateRules, type Rule } from '@ankhorage/rules';
import { expect, test } from 'bun:test';

import { createAccessibilityFact } from '../../../test/fixtures/accessibilityFacts';
import { createAccessibilityRules } from './createAccessibilityRules';

const rules = createAccessibilityRules();

test('defines exactly the frozen Accessibility and Semantics rule IDs', () => {
  expect(rules.map((rule) => rule.identity.id)).toEqual([
    'design.a11y.accessible-name',
    'design.a11y.form-label',
    'design.a11y.error-association',
    'design.a11y.keyboard-reachability',
    'design.a11y.focus-order',
    'design.a11y.color-only',
    'design.a11y.reduced-motion',
    'design.a11y.landmarks',
    'design.a11y.main-landmark',
    'design.a11y.list-semantics',
    'design.a11y.button-link-semantics',
    'design.a11y.status-feedback',
    'design.a11y.text-alternatives',
  ]);
});

for (const rule of rules) {
  test(`${rule.identity.id} passes with measured conforming evidence`, () => {
    expect(evaluate(rule, true).status).toBe('PASS');
  });

  test(`${rule.identity.id} fails with measured non-conforming evidence`, () => {
    const result = evaluate(rule, false);
    expect(result.status).toBe('FAIL');
    expect(result.findings).toEqual([
      expect.objectContaining({
        evidence: {
          detail: 'The measured subject does not satisfy the declared accessibility invariant.',
          observationId: `fixture-observation-${rule.identity.id}`,
        },
        ruleId: rule.identity.id,
        subjects: [{ id: 'fixture-subject', kind: 'element' }],
      }),
    ]);
  });

  test(`${rule.identity.id} is incomplete without measured evidence`, () => {
    const result = evaluateRules({ facts: [] }, [rule], evaluationOptions(rule));
    expect(result.results).toEqual([expect.objectContaining({ status: 'INCOMPLETE' })]);
  });
}

test('does not treat a malformed available fact as passing evidence', () => {
  const [rule] = rules;
  const fact = createAccessibilityFact({
    detail: 'ignored',
    passed: true,
    ruleId: rule.identity.id,
  });
  const result = evaluateRules(
    { facts: [{ ...fact, value: { observations: [{ id: 'missing-required-fields' }] } }] },
    [rule],
    evaluationOptions(rule),
  );
  expect(result.results).toEqual([expect.objectContaining({ status: 'INCOMPLETE' })]);
});

/*** Evaluates one rule with a frozen fact at its matching page scope. */
function evaluate(rule: Rule<{ readonly facts: readonly unknown[] }>, passed: boolean) {
  return evaluateRules(
    {
      facts: [
        createAccessibilityFact({
          detail: 'The measured subject does not satisfy the declared accessibility invariant.',
          passed,
          ruleId: rule.identity.id,
        }),
      ],
    },
    [rule],
    evaluationOptions(rule),
  ).results[0];
}

/*** Supplies the exact declared capabilities and scope for deterministic unit evaluation. */
function evaluationOptions(rule: Rule) {
  return {
    capabilities: rule.requiredCapabilities,
    scope: { id: 'fixture-page', kind: 'page' },
  };
}
