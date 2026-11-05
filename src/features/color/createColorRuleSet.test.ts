import type { AvailableFactEnvelope } from '@ankhorage/contracts/rules';
import type { JsonValue } from '@ankhorage/rules';
import { expect, test } from 'bun:test';

import { type ColorRulePolicy, createColorRuleSet } from './createColorRuleSet';

const scope = { id: 'home', kind: 'page' };
const policy: ColorRulePolicy = {
  acceptedValues: {
    'design.color.active-state': true,
    'design.color.alpha-composition': true,
    'design.color.disabled-state': true,
    'design.color.hover-state': true,
    'design.color.literal-drift': true,
    'design.color.ramp-consistency': true,
    'design.color.semantic-role': true,
    'design.color.surface-role': true,
    'design.color.syntax-valid': true,
    'design.color.theme-coverage': true,
    'design.color.token-allowed': true,
    'design.color.token-exists': true,
  },
  requiredBreakpointIds: ['desktop'],
  requiredScopes: ['page'],
  requiredThemeIds: ['light'],
  roleTargets: { accent: 0.1, base: 0.6, secondary: 0.3 },
  roleTolerances: { accent: 0.05, base: 0.05, secondary: 0.05 },
  version: 1,
};
const ruleIds = [
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
  'design.color.usage-distribution',
];

test('creates all thirteen frozen Color and Tokens rules', () =>
  expect(createColorRuleSet(policy).rules.map((rule) => rule.identity.id)).toEqual(ruleIds));

test.each(ruleIds.slice(0, -1))(
  '%s assesses normalized observations rather than adapter verdicts',
  (ruleId) => {
    const pass = evaluate(ruleId, [
      fact(ruleId, {
        actual: true,
        expected: false,
        outcome: 'fail',
        subject: { id: 'button', kind: 'component' },
      }),
    ]);
    const fail = evaluate(ruleId, [
      fact(ruleId, {
        actual: false,
        expected: true,
        outcome: 'pass',
        subject: { id: 'button', kind: 'component' },
      }),
    ]);
    expect([pass.results[0]?.status, fail.results[0]?.status]).toEqual(['PASS', 'FAIL']);
  },
);

test('requires exact fact scope and kind for every atomic rule', () => {
  const [ruleId] = ruleIds;
  const source = fact(ruleId, {
    actual: true,
    expected: false,
    subject: { id: 'button', kind: 'component' },
  });
  expect(
    evaluate(ruleId, [{ ...source, scope: { ...source.scope, id: 'other' } }]).results[0]?.status,
  ).toBe('INCOMPLETE');
  expect(
    evaluate(ruleId, [{ ...source, scope: { ...source.scope, kind: 'component' } }]).results[0]
      ?.status,
  ).toBe('INCOMPLETE');
});

test('evaluates full-page 60-30-10 facts independently by breakpoint and theme while keeping local samples advisory', () => {
  const facts = [
    distribution('page'),
    distribution('viewport', { accent: 50, base: 30, secondary: 20 }, 'hero'),
    distribution('page', undefined, 'page', 'mobile', 'dark'),
    distribution(
      'scroll-sample',
      { accent: 50, base: 30, secondary: 20 },
      'footer',
      'mobile',
      'dark',
    ),
  ];
  const result = evaluate('design.color.usage-distribution', facts, {
    ...policy,
    requiredScopes: ['page', 'viewport', 'scroll-sample'],
  });
  expect(result.results[0]?.status).toBe('INCOMPLETE');
  const isolated = evaluate(
    'design.color.usage-distribution',
    [
      distribution('page'),
      distribution('viewport', { accent: 50, base: 30, secondary: 20 }, 'hero'),
    ],
    { ...policy, requiredScopes: ['page', 'viewport'] },
  );
  expect(isolated.results[0]?.status).toBe('PASS');
  expect(isolated.findings.every((finding) => finding.severity === 'info')).toBe(true);
});

test('rejects unknown or non-total pixels, absent required coverage, and invalid targets or tolerances', () => {
  const invalidFacts = [
    envelope('design.color.usage-distribution', {
      breakpointId: 'desktop',
      measuredPixels: 100,
      rolePixels: { accent: 10, base: 59, secondary: 30, unknown: 1 },
      scope: 'page',
      scopeId: 'page',
      themeId: 'light',
      unknownPixels: 1,
    }),
    envelope('design.color.usage-distribution', {
      breakpointId: 'desktop',
      measuredPixels: 100,
      rolePixels: { accent: 10, base: 59, secondary: 30, unknown: 0 },
      scope: 'page',
      scopeId: 'page',
      themeId: 'light',
      unknownPixels: 0,
    }),
  ];
  for (const value of invalidFacts)
    expect(evaluate('design.color.usage-distribution', [value]).results[0]?.status).toBe(
      'INCOMPLETE',
    );
  expect(
    evaluate('design.color.usage-distribution', [distribution('viewport')]).results[0]?.status,
  ).toBe('INCOMPLETE');
  expect(() =>
    createColorRuleSet({ ...policy, roleTargets: { accent: 0.1, base: 0.5, secondary: 0.3 } }),
  ).toThrow('Color rule policy must define complete acceptance and coverage configuration.');
  expect(() =>
    createColorRuleSet({ ...policy, roleTolerances: { accent: 2, base: 0, secondary: 0 } }),
  ).toThrow('Color rule policy must define complete acceptance and coverage configuration.');
});

test('does not pass when trusted breakpoint and theme coverage is absent from otherwise valid facts', () => {
  const result = evaluate('design.color.usage-distribution', [distribution('page')], {
    ...policy,
    requiredBreakpointIds: ['desktop', 'mobile'],
    requiredThemeIds: ['light', 'dark'],
  });

  expect(result.results[0]?.status).toBe('INCOMPLETE');
});

test('does not pass an empty rendered-area observation', () => {
  const empty = envelope('design.color.usage-distribution', {
    breakpointId: 'desktop',
    measuredPixels: 0,
    rolePixels: { accent: 0, base: 0, secondary: 0, unknown: 0 },
    scope: 'page',
    scopeId: 'page',
    themeId: 'light',
    unknownPixels: 0,
  });

  expect(evaluate('design.color.usage-distribution', [empty]).results[0]?.status).toBe(
    'INCOMPLETE',
  );
});

/*** Evaluates one Color rule with its fact-backed context. */
function evaluate(
  ruleId: string,
  facts: readonly AvailableFactEnvelope[],
  configuredPolicy: ColorRulePolicy = policy,
) {
  const rule = createColorRuleSet(configuredPolicy).rules.find(
    (candidate) => candidate.identity.id === ruleId,
  );
  if (!rule) throw new Error(`Missing ${ruleId}`);
  const outcome = rule.evaluate({
    context: { evidence: [], facts },
    dependencyResults: [],
    options: undefined,
    scope,
  });
  return { findings: outcome.findings, results: [outcome] };
}
/*** Creates an exact-scope Color policy fact. */
function fact(kind: string, value: JsonValue): AvailableFactEnvelope {
  return envelope(kind, value);
}
/*** Creates one rendered-area fact with exclusive, complete role pixels. */
function distribution(
  coverageScope: string,
  roles = { accent: 10, base: 60, secondary: 30 },
  scopeId = 'page',
  breakpointId = 'desktop',
  themeId = 'light',
): AvailableFactEnvelope & {
  readonly value: {
    readonly breakpointId: string;
    readonly measuredPixels: number;
    readonly rolePixels: {
      readonly accent: number;
      readonly base: number;
      readonly secondary: number;
      readonly unknown: number;
    };
    readonly scope: string;
    readonly scopeId: string;
    readonly themeId: string;
    readonly unknownPixels: number;
  };
} {
  return envelope('design.color.usage-distribution', {
    breakpointId,
    measuredPixels: 100,
    rolePixels: { ...roles, unknown: 0 },
    scope: coverageScope,
    scopeId,
    themeId,
    unknownPixels: 0,
  }) as AvailableFactEnvelope & {
    readonly value: {
      readonly breakpointId: string;
      readonly measuredPixels: number;
      readonly rolePixels: {
        readonly accent: number;
        readonly base: number;
        readonly secondary: number;
        readonly unknown: number;
      };
      readonly scope: string;
      readonly scopeId: string;
      readonly themeId: string;
      readonly unknownPixels: number;
    };
  };
}
/*** Creates a canonical available envelope for a Color observation. */
function envelope(kind: string, value: JsonValue): AvailableFactEnvelope {
  return {
    contentHash: `sha256:${kind}`,
    id: `${kind}:home`,
    kind,
    provenance: {
      collectedAt: '2026-11-05T00:00:00.000Z',
      producer: { id: 'fixture', version: '1' },
      source: { id: 'fixture', revision: null },
    },
    schemaVersion: 1,
    scope: {
      ...scope,
      target: { kind: 'application', projectId: 'project', targetId: 'home', tenantId: 'tenant' },
    },
    status: 'available',
    value,
  };
}
