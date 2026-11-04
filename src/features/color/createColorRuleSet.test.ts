import { expect, test } from 'bun:test';

import type { DesignColorPolicyRuleId } from '../../types/designRuleProvider';
import { createColorRuleSet } from './createColorRuleSet.ts';

const distributionOptions = {
  requiredScopes: ['page'] as const,
  roleTargets: { accent: 0.1, base: 0.6, secondary: 0.3 },
  roleTolerances: { accent: 0.05, base: 0.05, secondary: 0.05 },
  version: 1 as const,
};

const policyRuleIds: readonly DesignColorPolicyRuleId[] = [
  'design.color.syntax-valid',
  'design.color.token-exists',
  'design.color.token-allowed',
  'design.color.semantic-role',
  'design.color.literal-drift',
  'design.color.ramp-consistency',
  'design.color.alpha-composition',
  'design.color.surface-role',
  'design.color.hover-state',
  'design.color.active-state',
  'design.color.disabled-state',
  'design.color.theme-coverage',
];

test('evaluates every color policy rule from its normalized pass, failure, and missing facts', () => {
  for (const ruleId of policyRuleIds) {
    const rule = createColorRuleSet().rules.find((candidate) => candidate.identity.id === ruleId);
    if (!rule) throw new Error(`Color policy rule ${ruleId} is missing.`);
    const pass = rule.evaluate({
      context: {
        colorPolicyFacts: [
          {
            evidence: { actual: 'valid', expected: 'valid' },
            outcome: 'pass',
            ruleId,
            scopeId: 'button',
          },
        ],
        evidence: [],
      },
      dependencyResults: [],
      options: undefined,
      scope: { id: 'page', kind: 'page' },
    });
    const fail = rule.evaluate({
      context: {
        colorPolicyFacts: [
          {
            evidence: { actual: 'invalid', expected: 'valid' },
            outcome: 'fail',
            ruleId,
            scopeId: 'button',
          },
        ],
        evidence: [],
      },
      dependencyResults: [],
      options: undefined,
      scope: { id: 'page', kind: 'page' },
    });
    const incomplete = rule.evaluate({
      context: { evidence: [] },
      dependencyResults: [],
      options: undefined,
      scope: { id: 'page', kind: 'page' },
    });

    expect([pass.status, fail.status, incomplete.status]).toEqual(['PASS', 'FAIL', 'INCOMPLETE']);
  }
});

test('passes a complete full-page 60-30-10 distribution and keeps a divergent hero diagnostic local', () => {
  const outcome = usageDistributionRule().evaluate({
    context: {
      colorUsageDistributionFacts: [
        distributionFact('page', { accent: 10, base: 60, secondary: 30 }),
        distributionFact('viewport', { accent: 50, base: 30, secondary: 20 }, 'hero'),
      ],
      evidence: [],
    },
    dependencyResults: [],
    options: { ...distributionOptions, requiredScopes: ['page', 'viewport'] },
    scope: { id: 'home', kind: 'page' },
  });

  expect(outcome.status).toBe('PASS');
  expect(outcome.findings).toHaveLength(3);
  expect(outcome.findings.every((finding) => finding.severity === 'info')).toBe(true);
  expect(outcome.findings.map((finding) => finding.message)).toEqual([
    'base locally deviates from the page-level distribution target.',
    'secondary locally deviates from the page-level distribution target.',
    'accent locally deviates from the page-level distribution target.',
  ]);
});

test('fails a full-page share outside tolerance and accepts the tolerance boundary', () => {
  const outsideTolerance = usageDistributionRule().evaluate({
    context: {
      colorUsageDistributionFacts: [
        distributionFact('page', { accent: 10, base: 54, secondary: 36 }),
      ],
      evidence: [],
    },
    dependencyResults: [],
    options: distributionOptions,
    scope: { id: 'home', kind: 'page' },
  });
  const boundary = usageDistributionRule().evaluate({
    context: {
      colorUsageDistributionFacts: [
        distributionFact('page', { accent: 10, base: 55, secondary: 35 }),
      ],
      evidence: [],
    },
    dependencyResults: [],
    options: distributionOptions,
    scope: { id: 'home', kind: 'page' },
  });

  expect(outsideTolerance.status).toBe('FAIL');
  expect(boundary.status).toBe('PASS');
});

test('does not combine breakpoints and returns incomplete for absent scope or unresolved painted area', () => {
  const separateBreakpoints = usageDistributionRule().evaluate({
    context: {
      colorUsageDistributionFacts: [
        distributionFact('page', { accent: 10, base: 60, secondary: 30 }, 'desktop', 'desktop'),
        distributionFact('page', { accent: 10, base: 60, secondary: 30 }, 'mobile', 'mobile'),
      ],
      evidence: [],
    },
    dependencyResults: [],
    options: distributionOptions,
    scope: { id: 'home', kind: 'page' },
  });
  const missingScope = usageDistributionRule().evaluate({
    context: { colorUsageDistributionFacts: [distributionFact('viewport')], evidence: [] },
    dependencyResults: [],
    options: distributionOptions,
    scope: { id: 'home', kind: 'page' },
  });
  const unknownArea = usageDistributionRule().evaluate({
    context: {
      colorUsageDistributionFacts: [{ ...distributionFact('page'), unknownPixels: 1 }],
      evidence: [],
    },
    dependencyResults: [],
    options: distributionOptions,
    scope: { id: 'home', kind: 'page' },
  });

  expect(separateBreakpoints.status).toBe('PASS');
  expect(missingScope.status).toBe('INCOMPLETE');
  expect(unknownArea.status).toBe('INCOMPLETE');
});

/*** Returns the local group rule without involving the separate central registration task. */
function usageDistributionRule() {
  const rule = createColorRuleSet().rules.find(
    (candidate) => candidate.identity.id === 'design.color.usage-distribution',
  );
  if (!rule) throw new Error('Color usage distribution rule is missing.');
  return rule;
}

/*** Creates one complete exclusive-pixel measurement fixture for a chosen evidence scope. */
function distributionFact(
  scope: 'page' | 'viewport',
  rolePixels = { accent: 10, base: 60, secondary: 30 },
  scopeId = 'page',
  breakpointId = 'desktop',
) {
  return {
    breakpointId,
    measuredPixels: 100,
    rolePixels: { ...rolePixels, unknown: 0 },
    scope,
    scopeId,
    themeId: 'light',
    unknownPixels: 0,
  };
}
