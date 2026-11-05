import type { FactEnvelope } from '@ankhorage/contracts/rules';
import { evaluateRules, type JsonValue, type RuleScope } from '@ankhorage/rules';
import { expect, test } from 'bun:test';

import { createSpacingProximityRuleSet } from './createSpacingProximityRuleSet.ts';

const ruleSet = createSpacingProximityRuleSet();

test('declares exactly the frozen group IDs with their local capabilities and facets', () => {
  expect(ruleSet.rules.map((rule) => rule.identity.id)).toEqual(Object.keys(scenarios));
  expect(
    ruleSet.rules.find((rule) => rule.identity.id === 'design.spacing.token-allowed')
      ?.requiredCapabilities,
  ).toEqual(['source.style-tokens']);
  expect(
    ruleSet.rules.find((rule) => rule.identity.id === 'design.proximity.related-grouping')?.facets,
  ).toContainEqual({ id: 'topic', value: 'proximity' });
});

const scenarios: Readonly<Record<string, Scenario>> = {
  'design.spacing.token-allowed': scenario(
    {
      permittedTokens: [{ name: 'space.2', value: 8 }],
      tokenUsages: [{ name: 'space.2', value: 8 }],
    },
    {
      permittedTokens: [{ name: 'space.2', value: 8 }],
      tokenUsages: [{ name: 'space.2', value: 12 }],
    },
    {
      permittedTokens: [
        { name: 'space.2', value: 8 },
        { name: 'space.4', value: 16 },
      ],
      tokenUsages: [
        { name: 'space.2', value: 8 },
        { name: 'space.4', value: 16 },
      ],
    },
  ),
  'design.spacing.vertical-rhythm': scenario(
    { gaps: [8], rhythmUnit: 8 },
    { gaps: [12], rhythmUnit: 8 },
    { gaps: [8, 16, 24], rhythmUnit: 8 },
  ),
  'design.spacing.section-gap': scenario(
    { gaps: [16], permittedValues: [16, 32] },
    { gaps: [24], permittedValues: [16, 32] },
    { gaps: [16, 32], permittedValues: [16, 32] },
  ),
  'design.spacing.container-padding': scenario(
    { containers: [{ bottom: 16, left: 16, right: 16, top: 16 }], permittedValues: [16] },
    { containers: [{ bottom: 16, left: 16, right: 16, top: 12 }], permittedValues: [16] },
    { containers: [{ bottom: 24, left: 16, right: 16, top: 24 }], permittedValues: [16, 24] },
  ),
  'design.proximity.related-grouping': scenario(
    { groups: [{ nearestUnrelatedDistance: 12, relatedDistances: [12] }] },
    { groups: [{ nearestUnrelatedDistance: 12, relatedDistances: [16] }] },
    { groups: [{ nearestUnrelatedDistance: 24, relatedDistances: [8, 16] }] },
  ),
  'design.proximity.unrelated-separation': scenario(
    { groups: [{ internalDistances: [8], unrelatedDistance: 8.01 }] },
    { groups: [{ internalDistances: [8], unrelatedDistance: 8 }] },
    { groups: [{ internalDistances: [8, 12], unrelatedDistance: 16 }] },
  ),
  'design.proximity.label-control': scenario(
    { groups: [{ nearestUnrelatedDistance: 8, relatedDistances: [8] }] },
    { groups: [{ nearestUnrelatedDistance: 8, relatedDistances: [12] }] },
    { groups: [{ nearestUnrelatedDistance: 16, relatedDistances: [8] }] },
  ),
  'design.proximity.heading-content': scenario(
    { groups: [{ nearestUnrelatedDistance: 12, relatedDistances: [12] }] },
    { groups: [{ nearestUnrelatedDistance: 12, relatedDistances: [16] }] },
    { groups: [{ nearestUnrelatedDistance: 24, relatedDistances: [12] }] },
  ),
  'design.proximity.card-internals': scenario(
    { cards: [{ internalDistances: [16], nearestOutsideDistance: 16 }] },
    { cards: [{ internalDistances: [20], nearestOutsideDistance: 16 }] },
    { cards: [{ internalDistances: [8, 16], nearestOutsideDistance: 24 }] },
  ),
  'design.spacing.double-application': scenario(
    { pairs: [{ childSpacing: 16, parentSpacing: 8, renderedDistance: 16 }] },
    { pairs: [{ childSpacing: 16, parentSpacing: 8, renderedDistance: 24 }] },
    { pairs: [{ childSpacing: 16, parentSpacing: 16, renderedDistance: 16 }] },
  ),
  'design.spacing.unexpected-collapse': scenario(
    {
      pairs: [
        { followingMargin: 8, precedingMargin: 8, renderedDistance: 16, separatesMargins: true },
      ],
    },
    {
      pairs: [
        { followingMargin: 8, precedingMargin: 8, renderedDistance: 8, separatesMargins: true },
      ],
    },
    {
      pairs: [
        { followingMargin: 8, precedingMargin: 16, renderedDistance: 24, separatesMargins: true },
      ],
    },
  ),
};

for (const [ruleId, scenario] of Object.entries(scenarios)) {
  test(`${ruleId} derives PASS, FAIL, INCOMPLETE, and its measurement boundary`, () => {
    const scope = scopeFor(ruleId);
    expect(evaluate(ruleId, scenario.pass, scope).results[0]?.status).toBe('PASS');
    const failure = evaluate(ruleId, scenario.fail, scope);
    expect(failure.results[0]?.status).toBe('FAIL');
    expect(failure.findings[0]?.evidence).toMatchObject({
      factId: 'spacing-proximity-fact',
      scopeId: scope.id,
    });
    expect(evaluate(ruleId, scenario.boundary, scope).results[0]?.status).toBe('PASS');
    expect(evaluate(ruleId, {}, scope).results[0]?.status).toBe('INCOMPLETE');
    expect(evaluateWithoutEvidence(ruleId, scope).results[0]?.status).toBe('INCOMPLETE');
  });
}

interface Scenario {
  readonly boundary: JsonValue;
  readonly fail: JsonValue;
  readonly pass: JsonValue;
}

function scenario(boundary: JsonValue, fail: JsonValue, pass: JsonValue): Scenario {
  return { boundary, fail, pass };
}

function evaluate(ruleId: string, observation: JsonValue, scope: RuleScope) {
  return evaluateRules(
    [fact(ruleId, observation, scope)],
    ruleSet.rules.filter((rule) => rule.identity.id === ruleId),
    { capabilities: ['dom.layout', 'source.style-tokens'], scope },
  );
}

function fact(ruleId: string, observation: JsonValue, scope: RuleScope): FactEnvelope {
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
    value: { observations: [{ kind: ruleId, value: observation }], schemaVersion: 2 },
  };
}

function evaluateWithoutEvidence(ruleId: string, scope: RuleScope) {
  return evaluateRules(
    [],
    ruleSet.rules.filter((rule) => rule.identity.id === ruleId),
    {
      capabilities: ['dom.layout', 'source.style-tokens'],
      scope,
    },
  );
}

function scopeFor(ruleId: string): RuleScope {
  return ruleId === 'design.spacing.token-allowed'
    ? { id: 'fixture-project', kind: 'project' }
    : { id: 'fixture-component', kind: 'component' };
}
