import { evaluateRules } from '@ankhorage/rules';
import { expect, test } from 'bun:test';

import {
  createMissingRepetitionFact,
  createRepetitionFact,
  repetitionScope,
} from '../../../test/fixtures/repetitionRuleFacts.ts';
import { designRuleCatalog } from '../catalog/designRuleCatalog.ts';
import { createRepetitionRules, type RepetitionRuleContext } from './createRepetitionRules.ts';

const repetitionRules = createRepetitionRules();

test('implements exactly the canonical Repetition catalog IDs with their declared capability', () => {
  const catalogIds = designRuleCatalog
    .filter((entry) => entry.group === 'Repetition & Components')
    .map((entry) => entry.id);

  expect(repetitionRules.map((rule) => rule.identity.id) as readonly string[]).toEqual(catalogIds);
  expect(
    repetitionRules.every((rule) => rule.requiredCapabilities?.[0] === 'ui.component-tree'),
  ).toBe(true);
});

for (const rule of repetitionRules) {
  test(`${rule.identity.id} passes when its inspected value matches the expected repeated value`, () => {
    const context: RepetitionRuleContext = {
      facts: [
        createRepetitionFact(rule.identity.id, { radius: 8, tokens: ['space-2', 'space-4'] }),
      ],
    };

    expect(evaluate(rule, context).status).toBe('PASS');
  });

  test(`${rule.identity.id} fails when its inspected value differs from the expected repeated value`, () => {
    const context: RepetitionRuleContext = {
      facts: [createRepetitionFact(rule.identity.id, { radius: 4 }, { radius: 8 })],
    };

    const result = evaluate(rule, context);
    expect(result.status).toBe('FAIL');
    expect(result.findings).toEqual([
      expect.objectContaining({
        evidence: {
          actual: { radius: 4 },
          expected: { radius: 8 },
          factId: `${rule.identity.id}:checkout-summary`,
        },
        ruleId: rule.identity.id,
      }),
    ]);
  });

  test(`${rule.identity.id} is incomplete without inspected facts for its exact scope`, () => {
    const context: RepetitionRuleContext = {
      facts: [
        {
          ...createRepetitionFact(rule.identity.id, { value: 'matching' }),
          scope: {
            id: 'other-component',
            kind: 'component',
            target: {
              kind: 'application',
              projectId: 'checkout',
              targetId: 'other-component',
              tenantId: 'test-tenant',
            },
          },
        },
      ],
    };

    const result = evaluate(rule, context);
    expect(result.status).toBe('INCOMPLETE');
    expect(result.findings).toEqual([
      expect.objectContaining({ evidence: { factCount: 0, scopeId: repetitionScope.id } }),
    ]);
  });
}

test('does not mutate supplied Repetition facts while evaluating every rule', () => {
  const context: RepetitionRuleContext = {
    facts: repetitionRules.map((rule) =>
      createRepetitionFact(rule.identity.id, { value: rule.identity.id }),
    ),
  };
  const before = structuredClone(context);

  const results = evaluateRules(context, repetitionRules, {
    capabilities: ['ui.component-tree'],
    scope: repetitionScope,
  });

  expect(results.results.every((result) => result.status === 'PASS')).toBe(true);
  expect(context).toEqual(before);
});

test('compares object facts by their normalized values rather than property insertion order', () => {
  const [rule] = repetitionRules;
  const context: RepetitionRuleContext = {
    facts: [
      createRepetitionFact(
        rule.identity.id,
        { color: 'blue', radius: 8 },
        { radius: 8, color: 'blue' },
      ),
    ],
  };

  expect(evaluate(rule, context).status).toBe('PASS');
});

test('is incomplete for explicit missing, malformed, or foreign-scoped facts', () => {
  const [rule] = repetitionRules;
  const available = createRepetitionFact(rule.identity.id, { value: 'matching' });
  const contexts: readonly RepetitionRuleContext[] = [
    { facts: [available, createMissingRepetitionFact(rule.identity.id)] },
    { facts: [available, { ...available, value: { actual: { value: 'matching' } } }] },
    { facts: [{ ...available, scope: { ...available.scope, kind: 'page' } }] },
  ];

  for (const context of contexts) expect(evaluate(rule, context).status).toBe('INCOMPLETE');
});

function evaluate(rule: (typeof repetitionRules)[number], context: RepetitionRuleContext) {
  const result = evaluateRules(context, [rule], {
    capabilities: ['ui.component-tree'],
    scope: repetitionScope,
  });
  return result.results[0];
}
