import type { AvailableFactEnvelope } from '@ankhorage/contracts/rules';
import type { JsonValue } from '@ankhorage/rules';
import { expect, test } from 'bun:test';

import { createColorRuleSet } from './createColorRuleSet';
const scope = { id: 'home', kind: 'page' };
const options = {
  breakpointId: 'desktop',
  requiredScopes: ['page'] as const,
  roleTolerances: { base: 0.05, secondary: 0.05, accent: 0.05 },
  themeId: 'light',
  version: 1 as const,
};
test('derives frozen policy verdicts from facts rather than adapter PASS or FAIL labels', () => {
  const rule = createColorRuleSet().rules.find(
    (candidate) => candidate.identity.id === 'design.color.syntax-valid',
  );
  if (!rule) throw new Error('missing');
  expect(
    rule.evaluate(
      input([
        fact('design.color-policy.observations', {
          schemaVersion: 1,
          observations: [
            { ruleId: 'design.color.syntax-valid', expected: 'valid', actual: 'invalid' },
          ],
        }),
      ]),
    ).status,
  ).toBe('FAIL');
});
test('assesses complete page pixels and retains local deviations as advisory diagnostics', () => {
  const result = usage().evaluate(
    input([
      measurement('page', { base: 60, secondary: 30, accent: 10 }),
      measurement('viewport', { base: 30, secondary: 20, accent: 50 }, 'hero'),
    ]),
  );
  expect(result.status).toBe('PASS');
  expect(result.findings.every((finding) => finding.severity === 'info')).toBe(true);
});
test('fails closed for unknown coverage, invalid totals, or an inexact breakpoint and theme', () => {
  for (const value of [
    measurement('page', { base: 59, secondary: 30, accent: 10 }, 'home', 1),
    measurement('page', { base: 60, secondary: 30, accent: 10 }, 'home', 0, 'mobile'),
  ])
    expect(usage().evaluate(input([value])).status).toBe('INCOMPLETE');
});
test('honours pixel-share tolerances at the boundary and fails outside them', () => {
  expect(
    usage().evaluate(input([measurement('page', { base: 55, secondary: 35, accent: 10 })])).status,
  ).toBe('PASS');
  expect(
    usage().evaluate(input([measurement('page', { base: 54, secondary: 36, accent: 10 })])).status,
  ).toBe('FAIL');
});
function usage() {
  const rule = createColorRuleSet().rules.find(
    (candidate) => candidate.identity.id === 'design.color.usage-distribution',
  );
  if (!rule) throw new Error('missing');
  return rule;
}
function input(facts: readonly AvailableFactEnvelope[]) {
  return { context: { evidence: [], facts }, dependencyResults: [], options, scope };
}
function fact(kind: string, value: JsonValue): AvailableFactEnvelope {
  return {
    contentHash: 'hash',
    id: kind,
    kind,
    provenance: {
      collectedAt: '2026-11-05T00:00:00Z',
      producer: { id: 'test', version: '1' },
      source: { id: 'test', revision: null },
    },
    schemaVersion: 1,
    scope: {
      ...scope,
      target: { tenantId: 'tenant', projectId: 'project', targetId: 'target', kind: 'page' },
    },
    status: 'available',
    value,
  };
}
function measurement(
  kind: 'page' | 'viewport',
  rolePixels: { readonly base: number; readonly secondary: number; readonly accent: number },
  scopeId = 'home',
  unknownPixels = 0,
  breakpointId = 'desktop',
) {
  return fact('design.color.usage-distribution', {
    schemaVersion: 1,
    breakpointId,
    themeId: 'light',
    scope: kind,
    scopeId,
    measuredPixels: 100,
    rolePixels,
    unknownPixels,
  });
}
