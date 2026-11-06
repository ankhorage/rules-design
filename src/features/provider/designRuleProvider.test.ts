import { createRuleEvaluationPlan, createRuleRegistry, evaluateRules } from '@ankhorage/rules';
import { expect, test } from 'bun:test';

import { typographyPolicy } from '../../../test/fixtures/typographyRuleFacts';
import { designRuleCatalog } from '../catalog/designRuleCatalog';
import { createDesignCrapRules } from './createDesignCrapRules';
import { createDesignRuleProvider } from './designRuleProvider';
import { selectDesignRuleProfile } from './selectDesignRuleProfile';

const provider = createDesignRuleProvider({
  color: {
    alphaCompositions: { 'ink/alpha': { 'surface/base': 'ink/on-base' } },
    allowedColorSyntaxes: ['hex', 'token'],
    allowedTokens: ['text/default', 'surface/base'],
    canonicalLiterals: { '#ffffff': 'surface/base' },
    knownTokens: ['text/default', 'surface/base', 'ink/alpha', 'ink/on-base'],
    rampTokens: { blue: ['blue/100', 'blue/500'] },
    requiredBreakpointIds: ['desktop'],
    requiredScopes: ['page'],
    requiredThemeIds: ['light'],
    roleTargets: { accent: 0.1, base: 0.6, secondary: 0.3 },
    roleTolerances: { accent: 0.05, base: 0.05, secondary: 0.05 },
    semanticRoleTokens: { foreground: ['text/default'], background: ['surface/base'] },
    stateTokens: { active: {}, disabled: {}, hover: {} },
    surfaceRoleTokens: { canvas: ['surface/base'] },
    themeTokens: { 'surface/base': ['light'] },
    version: 1,
  },
  typography: typographyPolicy,
});

test('registers every frozen atomic and C.R.A.P. rule through one provider', () => {
  const registry = createRuleRegistry([provider.ruleSet]);

  expect(registry.rules.map((rule) => rule.identity.id).sort()).toEqual(
    designRuleCatalog.map((entry) => entry.id).sort(),
  );
});

test('resolves C.R.A.P. as one deterministic dependency graph without a score', () => {
  const registry = createRuleRegistry([provider.ruleSet]);
  const selection = selectDesignRuleProfile('design.crap');
  const plan = createRuleEvaluationPlan(registry.rules, { selection: selection.selection });

  expect(selection).toEqual({
    profileId: 'design.crap',
    selection: { rootRuleIds: ['design.crap'] },
  });
  expect(plan.diagnostics).toEqual([]);
  expect(plan.nodes.filter((node) => node.rule.id === 'design.crap')).toHaveLength(1);
  expect(plan.nodes.find((node) => node.rule.id === 'design.crap')?.dependencyRuleIds).toEqual([
    'design.crap.alignment',
    'design.crap.contrast',
    'design.crap.proximity',
    'design.crap.repetition',
  ]);
});

test('keeps 60-30-10 as a profile selecting the existing usage-distribution rule', () => {
  const registry = createRuleRegistry([provider.ruleSet]);
  const selection = selectDesignRuleProfile('design.60-30-10');
  const result = evaluateRules({ facts: [] }, registry.rules, {
    capabilities: ['rendered.area-analysis'],
    selection: selection.selection,
  });

  expect(selection).toEqual({
    profileId: 'design.60-30-10',
    selection: { rootRuleIds: ['design.color.usage-distribution'] },
  });
  expect(result.results.map((entry) => [entry.rule.id, entry.status])).toEqual([
    ['design.color.usage-distribution', 'INCOMPLETE'],
  ]);
});

test('reports failed C.R.A.P. children and propagates incomplete children without evaluating a score', () => {
  const child = {
    defaultSeverity: 'warning' as const,
    dependencies: [],
    evaluate: () => ({ findings: [], status: 'FAIL' as const }),
    identity: { id: 'design.color.fixture', version: '1.0.0' },
    summary: 'Fixture child.',
  };
  const crapContrast = createDesignCrapRules([child]).find(
    (rule) => rule.identity.id === 'design.crap.contrast',
  );
  if (crapContrast === undefined) throw new Error('Missing C.R.A.P. contrast fixture rule.');

  const failed = evaluateRules({ facts: [] }, [child, crapContrast]);
  const incomplete = evaluateRules({ facts: [] }, [
    { ...child, evaluate: () => ({ findings: [], status: 'INCOMPLETE' as const }) },
    crapContrast,
  ]);

  expect(failed.results.map((entry) => [entry.rule.id, entry.status])).toEqual([
    ['design.color.fixture', 'FAIL'],
    ['design.crap.contrast', 'FAIL'],
  ]);
  expect(failed.findings.map((finding) => finding.evidence)).toEqual([
    { childRuleId: 'design.color.fixture', childStatus: 'FAIL' },
  ]);
  expect(incomplete.results.map((entry) => [entry.rule.id, entry.status])).toEqual([
    ['design.color.fixture', 'INCOMPLETE'],
    ['design.crap.contrast', 'INCOMPLETE'],
  ]);
});

test('rejects unknown profile IDs instead of treating them as rule IDs', () => {
  expect(() => selectDesignRuleProfile('design.unknown')).toThrow('Unknown Design profile');
});
