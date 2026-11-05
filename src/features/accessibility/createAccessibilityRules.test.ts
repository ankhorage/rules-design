import type { SerializableValue } from '@ankhorage/contracts';
import { evaluateRules, type Rule } from '@ankhorage/rules';
import { expect, test } from 'bun:test';

import { createAccessibilityFact } from '../../../test/fixtures/accessibilityFacts';
import { createAccessibilityRules } from './createAccessibilityRules';

const rules = createAccessibilityRules();
const cases: Readonly<
  Record<string, { readonly fail: SerializableValue; readonly pass: SerializableValue }>
> = {
  'design.a11y.accessible-name': observations(
    'control',
    { hasAccessibleName: true },
    { hasAccessibleName: false },
  ),
  'design.a11y.form-label': observations(
    'form-field',
    { hasProgrammaticLabel: true },
    { hasProgrammaticLabel: false },
  ),
  'design.a11y.error-association': observations(
    'validation-error',
    { associatedFieldId: 'email' },
    { associatedFieldId: '' },
  ),
  'design.a11y.keyboard-reachability': observations(
    'interactive-element',
    { keyboardReachable: true },
    { keyboardReachable: false },
  ),
  'design.a11y.focus-order': observations(
    'focus-sequence',
    { documentOrder: ['name', 'email', 'submit'], focusOrder: ['name', 'email', 'submit'] },
    { documentOrder: ['name', 'email', 'submit'], focusOrder: ['email', 'name', 'submit'] },
  ),
  'design.a11y.color-only': observations(
    'information-cue',
    { hasNonColorIndicator: true },
    { hasNonColorIndicator: false },
  ),
  'design.a11y.reduced-motion': observations(
    'motion-response',
    { motionObserved: false, prefersReducedMotion: true },
    { motionObserved: true, prefersReducedMotion: true },
  ),
  'design.a11y.landmarks': observations(
    'landmark',
    { hasAccessibleName: true, role: 'navigation' },
    { hasAccessibleName: false, role: 'region' },
  ),
  'design.a11y.main-landmark': observations('landmark-summary', { mainCount: 1 }, { mainCount: 0 }),
  'design.a11y.list-semantics': observations(
    'list',
    { itemRoles: ['listitem'], role: 'list' },
    { itemRoles: ['generic'], role: 'list' },
  ),
  'design.a11y.button-link-semantics': observations(
    'interactive-control',
    { behavior: 'action', role: 'button' },
    { behavior: 'navigation', role: 'button' },
  ),
  'design.a11y.status-feedback': observations(
    'status-message',
    { isAnnounced: true, role: 'status' },
    { isAnnounced: false, role: 'status' },
  ),
  'design.a11y.text-alternatives': observations(
    'media',
    { isDecorative: false, textAlternative: 'Company logo' },
    { isDecorative: false, textAlternative: '' },
  ),
};

test('defines exactly the frozen Accessibility and Semantics rule IDs', () => {
  expect(rules.map((rule) => rule.identity.id)).toEqual(Object.keys(cases));
});

for (const rule of rules) {
  const ruleCases = cases[rule.identity.id];
  test(`${rule.identity.id} passes only with its conforming semantic observation`, () => {
    expect(evaluate(rule, ruleCases.pass).status).toBe('PASS');
  });
  test(`${rule.identity.id} fails with its non-conforming semantic observation`, () => {
    const result = evaluate(rule, ruleCases.fail);
    expect(result.status).toBe('FAIL');
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.ruleId).toBe(rule.identity.id);
    expect(result.findings[0]?.subjects).toEqual([{ id: 'fixture-subject', kind: 'element' }]);
  });
  test(`${rule.identity.id} is incomplete for an empty valid fact envelope`, () => {
    expect(evaluate(rule, null, []).status).toBe('INCOMPLETE');
  });
  test(`${rule.identity.id} is incomplete for malformed observations`, () => {
    expect(evaluate(rule, { id: 'missing-normalized-fields' }).status).toBe('INCOMPLETE');
  });
}

test('does not use an adapter supplied generic passed flag', () => {
  const [rule] = rules;
  const result = evaluate(rule, {
    detail: 'The name is absent.',
    id: 'generic-passed-is-ignored',
    kind: 'control',
    passed: true,
    properties: { hasAccessibleName: false },
    subject: { id: 'fixture-subject', kind: 'element' },
  });
  expect(result.status).toBe('FAIL');
});

test('evaluates focus order from normalized focus and document-order evidence', () => {
  const rule = ruleFor('design.a11y.focus-order');
  expect(evaluate(rule, observation('focus-sequence', { order: 'meaningful' })).status).toBe(
    'INCOMPLETE',
  );
  expect(
    evaluate(
      rule,
      observation('focus-sequence', {
        documentOrder: ['name', 'email'],
        focusOrder: ['name', 'email'],
      }),
    ).status,
  ).toBe('PASS');
  expect(
    evaluate(
      rule,
      observation('focus-sequence', {
        documentOrder: ['name', 'email'],
        focusOrder: ['email', 'name'],
      }),
    ).status,
  ).toBe('FAIL');
  expect(
    evaluate(
      rule,
      observation('focus-sequence', {
        documentOrder: ['name', 'name'],
        focusOrder: ['name', 'name'],
      }),
    ).status,
  ).toBe('INCOMPLETE');
});

test('evaluates reduced-motion behavior while the preference is active', () => {
  const rule = ruleFor('design.a11y.reduced-motion');
  expect(
    evaluate(rule, observation('motion-response', { reducedMotion: 'respected' })).status,
  ).toBe('INCOMPLETE');
  expect(
    evaluate(
      rule,
      observation('motion-response', { motionObserved: false, prefersReducedMotion: true }),
    ).status,
  ).toBe('PASS');
  expect(
    evaluate(
      rule,
      observation('motion-response', { motionObserved: true, prefersReducedMotion: true }),
    ).status,
  ).toBe('FAIL');
  expect(
    evaluate(
      rule,
      observation('motion-response', { motionObserved: false, prefersReducedMotion: false }),
    ).status,
  ).toBe('INCOMPLETE');
});

test('accepts only finite non-negative integer main-landmark counts', () => {
  const rule = ruleFor('design.a11y.main-landmark');
  expect(evaluate(rule, observation('landmark-summary', { mainCount: 1 })).status).toBe('PASS');
  expect(evaluate(rule, observation('landmark-summary', { mainCount: 0 })).status).toBe('FAIL');
  expect(evaluate(rule, observation('landmark-summary', { mainCount: 2 })).status).toBe('FAIL');
  for (const mainCount of [NaN, Infinity, -1, 1.5]) {
    expect(evaluate(rule, observation('landmark-summary', { mainCount })).status).toBe(
      'INCOMPLETE',
    );
  }
});

test('fails closed for missing, unavailable, and scope-mismatched facts', () => {
  const [rule] = rules;
  const available = createAccessibilityFact({
    observation: cases[rule.identity.id].pass,
    ruleId: rule.identity.id,
  });
  const options = evaluationOptions(rule);
  expect(evaluateRules({ facts: [] }, [rule], options).results[0].status).toBe('INCOMPLETE');
  expect(
    evaluateRules(
      {
        facts: [
          {
            ...available,
            status: 'missing',
            missing: { code: 'unavailable', message: 'No measurement.' },
          },
        ],
      },
      [rule],
      options,
    ).results[0].status,
  ).toBe('INCOMPLETE');
  expect(
    evaluateRules(
      { facts: [{ ...available, scope: { ...available.scope, id: 'other-page' } }] },
      [rule],
      options,
    ).results[0].status,
  ).toBe('INCOMPLETE');
});

/*** Builds representative PASS and FAIL observations for one frozen rule invariant. */
function observations(
  kind: string,
  pass: Readonly<Record<string, SerializableValue>>,
  fail: Readonly<Record<string, SerializableValue>>,
) {
  return { fail: observation(kind, fail), pass: observation(kind, pass) };
}

/*** Builds one normalized serializable observation without an adapter verdict flag. */
function observation(kind: string, properties: Readonly<Record<string, SerializableValue>>) {
  return {
    detail: 'Observed accessibility behavior does not satisfy this invariant.',
    id: `fixture-observation-${kind}`,
    kind,
    properties,
    subject: { id: 'fixture-subject', kind: 'element' },
  };
}

/*** Evaluates one rule with a frozen fact at its matching page scope. */
function evaluate(
  rule: Rule<{ readonly facts: readonly unknown[] }>,
  observed: SerializableValue,
  observedValues?: readonly SerializableValue[],
) {
  const fact = createAccessibilityFact({ observation: observed, ruleId: rule.identity.id });
  const value = observedValues === undefined ? fact.value : { observations: observedValues };
  return evaluateRules({ facts: [{ ...fact, value }] }, [rule], evaluationOptions(rule)).results[0];
}

/*** Finds one frozen rule identity for its focused semantic regression. */
function ruleFor(id: string): Rule<{ readonly facts: readonly unknown[] }> {
  const rule = rules.find((candidate) => candidate.identity.id === id);
  if (rule === undefined) throw new Error(`Expected frozen rule ${id}.`);
  return rule;
}

/*** Supplies the exact declared capabilities and scope for deterministic unit evaluation. */
function evaluationOptions(rule: Rule) {
  return { capabilities: rule.requiredCapabilities, scope: { id: 'fixture-page', kind: 'page' } };
}
