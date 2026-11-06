import type { AvailableFactEnvelope } from '@ankhorage/contracts/rules';
import {
  createRuleEvaluationPlan,
  createRuleRegistry,
  evaluateRules,
  type RuleEvaluationInput,
} from '@ankhorage/rules';
import { expect, test } from 'bun:test';

import { typographyPolicy } from '../../../test/fixtures/typographyRuleFacts';
import type { DesignContext } from '../../types/designRuleProvider';
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
const pageScope = { id: 'home', kind: 'page' };

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

test('evaluates the 60-30-10 profile from full-page facts as pass, advisory deviation, and incomplete', () => {
  const registry = createRuleRegistry([provider.ruleSet]);
  const selection = selectDesignRuleProfile('design.60-30-10');
  const evaluateProfile = (facts: readonly AvailableFactEnvelope[]) =>
    evaluateRules({ facts }, registry.rules, {
      capabilities: ['rendered.area-analysis'],
      scope: pageScope,
      selection: selection.selection,
    });

  const passing = evaluateProfile([fullPageDistribution()]);
  const deviation = evaluateProfile([
    fullPageDistribution({ accent: 20, base: 50, secondary: 30 }),
  ]);
  const incomplete = evaluateProfile([]);

  expect(passing.results[0]?.status).toBe('PASS');
  expect(deviation.results[0]?.status).toBe('FAIL');
  expect(deviation.findings[0]).toMatchObject({
    evidence: { observed: 0.5, role: 'base', scope: 'page' },
    severity: 'warning',
  });
  expect(incomplete.results[0]?.status).toBe('INCOMPLETE');
});

test('executes the shared 60-30-10 child once when both mandatory profiles are selected', () => {
  const registry = createRuleRegistry([provider.ruleSet]);
  const usageRuleId = 'design.color.usage-distribution';
  const crapProfile = selectDesignRuleProfile('design.crap');
  const distributionProfile = selectDesignRuleProfile('design.60-30-10');
  let usageEvaluations = 0;
  const countingRules = registry.rules.map((rule) =>
    rule.identity.id === usageRuleId
      ? {
          ...rule,
          evaluate: (input: RuleEvaluationInput<DesignContext>) => {
            usageEvaluations += 1;
            return rule.evaluate(input);
          },
        }
      : rule,
  );

  const result = evaluateRules({ facts: [fullPageDistribution()] }, countingRules, {
    capabilities: ['rendered.area-analysis'],
    scope: pageScope,
    selection: {
      rootRuleIds: [
        ...crapProfile.selection.rootRuleIds,
        ...distributionProfile.selection.rootRuleIds,
      ],
    },
  });

  expect(result.plan.rootRuleIds).toEqual([usageRuleId, 'design.crap']);
  expect(result.results.filter((entry) => entry.rule.id === usageRuleId)).toHaveLength(1);
  expect(usageEvaluations).toBe(1);
});

test('returns the four C.R.A.P. principle results through a deterministic diamond plan', () => {
  const registry = createRuleRegistry([provider.ruleSet]);
  const selection = selectDesignRuleProfile('design.crap');
  const evaluateProfile = () =>
    evaluateRules({ facts: [fullPageDistribution()] }, registry.rules, {
      capabilities: ['rendered.area-analysis'],
      scope: pageScope,
      selection: selection.selection,
    });

  const first = evaluateProfile();
  const second = evaluateProfile();
  const principleIds = [
    'design.crap.alignment',
    'design.crap.contrast',
    'design.crap.proximity',
    'design.crap.repetition',
  ];

  const principleResults = first.results.filter((entry) => principleIds.includes(entry.rule.id));

  expect(principleResults.map((entry) => entry.rule.id).sort()).toEqual(principleIds);
  expect(principleResults.every((entry) => entry.status === 'INCOMPLETE')).toBe(true);
  expect(first.results.find((entry) => entry.rule.id === 'design.crap')?.status).toBe('INCOMPLETE');
  expect(first.results.map((entry) => [entry.rule.id, entry.status])).toEqual(
    second.results.map((entry) => [entry.rule.id, entry.status]),
  );
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

function fullPageDistribution(
  rolePixels = { accent: 10, base: 60, secondary: 30 },
): AvailableFactEnvelope {
  return {
    contentHash: 'sha256:full-page-distribution',
    id: 'design.color.usage-distribution:home',
    kind: 'design.color.usage-distribution',
    provenance: {
      collectedAt: '2026-11-06T00:00:00.000Z',
      producer: { id: 'fixture', version: '1' },
      source: { id: 'fixture', revision: null },
    },
    schemaVersion: 1,
    scope: {
      ...pageScope,
      target: { kind: 'application', projectId: 'project', targetId: 'home', tenantId: 'tenant' },
    },
    status: 'available',
    value: {
      breakpointId: 'desktop',
      measuredPixels: 100,
      rolePixels: { ...rolePixels, unknown: 0 },
      scope: 'page',
      scopeId: 'page',
      themeId: 'light',
      unknownPixels: 0,
    },
  };
}
