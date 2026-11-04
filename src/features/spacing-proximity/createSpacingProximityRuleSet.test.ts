import type { FactEnvelope } from '@ankhorage/contracts/rules';
import { evaluateRules, type RuleEvaluationResult, type RuleScope } from '@ankhorage/rules';
import { expect, test } from 'bun:test';

import { createSpacingProximityRuleSet } from './createSpacingProximityRuleSet.ts';

const ruleSet = createSpacingProximityRuleSet();

test('declares the frozen group IDs, explicit capabilities, and scope facets', () => {
  expect(ruleSet.rules.map((rule) => rule.identity.id)).toEqual([
    'design.spacing.token-allowed',
    'design.spacing.vertical-rhythm',
    'design.spacing.section-gap',
    'design.spacing.container-padding',
    'design.proximity.related-grouping',
    'design.proximity.unrelated-separation',
    'design.proximity.label-control',
    'design.proximity.heading-content',
    'design.proximity.card-internals',
    'design.spacing.double-application',
    'design.spacing.unexpected-collapse',
  ]);
  const tokenRule = ruleSet.rules.find(
    (rule) => rule.identity.id === 'design.spacing.token-allowed',
  );
  const groupingRule = ruleSet.rules.find(
    (rule) => rule.identity.id === 'design.proximity.related-grouping',
  );
  expect(tokenRule?.facets).toContainEqual({ id: 'scope', value: 'project' });
  expect(tokenRule?.requiredCapabilities).toEqual(['source.style-tokens']);
  expect(groupingRule?.defaultSeverity).toBe('warning');
  expect(groupingRule?.requiredCapabilities).toEqual(['dom.layout']);
});

for (const rule of ruleSet.rules) {
  test(`${rule.identity.id} passes, fails, and remains incomplete without an actual measurement`, () => {
    const scope = scopeFor(rule.identity.id);
    expect(evaluate(rule.identity.id, 'pass', scope).results[0]?.status).toBe('PASS');

    const failed = evaluate(rule.identity.id, 'fail', scope);
    expect(failed.results[0]?.status).toBe('FAIL');
    expect(failed.findings).toHaveLength(1);
    expect(failed.findings[0]?.ruleId).toBe(rule.identity.id);
    expect(failed.findings[0]?.message).toBe(`${rule.identity.id} failed from measured geometry.`);
    expect(failed.findings[0]?.evidence).toEqual({
      detail: `${rule.identity.id} failed from measured geometry.`,
      factId: 'spacing-proximity-fact',
      scopeId: scope.id,
    });

    expect(evaluate(rule.identity.id, 'incomplete', scope).results[0]?.status).toBe('INCOMPLETE');
    expect(evaluateWithoutMeasurements(rule.identity.id, scope).results[0]?.status).toBe(
      'INCOMPLETE',
    );
  });
}

function evaluate(ruleId: string, outcome: Outcome, scope: RuleScope): RuleEvaluationResult {
  return evaluateRules(
    [measurementsFact(ruleId, outcome, scope)],
    ruleSet.rules.filter((rule) => rule.identity.id === ruleId),
    { capabilities: ['dom.layout', 'source.style-tokens'], scope },
  );
}

function evaluateWithoutMeasurements(ruleId: string, scope: RuleScope): RuleEvaluationResult {
  return evaluateRules(
    [],
    ruleSet.rules.filter((rule) => rule.identity.id === ruleId),
    {
      capabilities: ['dom.layout', 'source.style-tokens'],
      scope,
    },
  );
}

type Outcome = 'fail' | 'incomplete' | 'pass';

function measurementsFact(ruleId: string, outcome: Outcome, scope: RuleScope): FactEnvelope {
  return {
    contentHash: 'sha256:spacing-proximity-fact',
    id: 'spacing-proximity-fact',
    kind: 'design.spacing-proximity.measurements',
    provenance: {
      collectedAt: '2026-11-05T00:00:00.000Z',
      producer: { id: 'fixture', version: '1.0.0' },
      source: { id: 'fixture', revision: '1' },
    },
    schemaVersion: 1,
    scope: {
      id: scope.id,
      kind: scope.kind,
      target: { kind: 'fixture', projectId: 'project', targetId: 'target', tenantId: 'tenant' },
    },
    status: 'available',
    value: {
      evaluations: [
        {
          detail: `${ruleId} ${outcome === 'fail' ? 'failed from measured geometry.' : 'was measured.'}`,
          outcome,
          ruleId,
        },
      ],
      schemaVersion: 1,
    },
  };
}

function scopeFor(ruleId: string): RuleScope {
  return ruleId === 'design.spacing.token-allowed'
    ? { id: 'fixture-project', kind: 'project' }
    : { id: 'fixture-component', kind: 'component' };
}
