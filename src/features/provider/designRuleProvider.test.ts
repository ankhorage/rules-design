import { createRuleRegistry, evaluateRules, type Rule, type RuleSet } from '@ankhorage/rules';
import { expect, test } from 'bun:test';

import {
  type DesignContext,
  type DesignEvidence,
  type DesignRuleProvider,
  designRuleProvider,
} from '../../index';

test('registers and evaluates through the generic Rules engine with an unrelated provider', () => {
  const unrelatedRule: Rule<DesignContext> = {
    defaultSeverity: 'info',
    dependencies: [],
    evaluate: () => ({ findings: [], status: 'PASS' }),
    identity: { id: 'fixture.unrelated', version: '1.0.0' },
    summary: 'Proves generic cross-provider composition.',
  };
  const provider: DesignRuleProvider = designRuleProvider;
  const ruleSets: readonly RuleSet<DesignContext>[] = [
    provider.ruleSet,
    { id: 'fixture.unrelated', rules: [unrelatedRule] },
  ];

  const registry = createRuleRegistry(ruleSets);
  const result = evaluateRules({ evidence: [] }, registry.rules, {
    scope: { id: 'fixture-design', kind: 'design' },
  });

  expect(registry.ruleSets.map((ruleSet) => ruleSet.id)).toEqual([
    'ankhorage.rules-design',
    'fixture.unrelated',
  ]);
  expect(result.diagnostics).toEqual([]);
  expect(result.results.map((entry) => [entry.rule.id, entry.status])).toEqual([
    ['design.evidence.present', 'FAIL'],
    ['fixture.unrelated', 'PASS'],
  ]);
  expect(result.findings).toEqual([
    expect.objectContaining({
      evidence: { evidenceCount: 0 },
      ruleId: 'design.evidence.present',
      severity: 'warning',
    }),
  ]);
});

test('passes the Design rule when the caller supplies Design evidence', () => {
  const evidence: readonly DesignEvidence[] = [{ id: 'hero', kind: 'component' }];
  const registry = createRuleRegistry([designRuleProvider.ruleSet]);
  const result = evaluateRules({ evidence }, registry.rules);

  expect(result.diagnostics).toEqual([]);
  expect(result.findings).toEqual([]);
  expect(result.results).toEqual([
    expect.objectContaining({
      rule: { id: 'design.evidence.present', version: '1.0.0' },
      status: 'PASS',
    }),
  ]);
});
