import type { AvailableFactEnvelope } from '@ankhorage/contracts/rules';
import type { JsonValue } from '@ankhorage/rules';
import { expect, test } from 'bun:test';

import { type ColorRulePolicy, createColorRuleSet } from './createColorRuleSet';

const scope = { id: 'home', kind: 'page' };
const policy: ColorRulePolicy = {
  alphaCompositions: { 'ink/alpha': { 'surface/base': 'ink/on-base' } },
  allowedColorSyntaxes: ['hex', 'token'],
  allowedTokens: ['text/default', 'surface/base'],
  canonicalLiterals: { '#ffffff': 'surface/base' },
  knownTokens: [
    'text/default',
    'surface/base',
    'text/on-surface',
    'button/default',
    'button/hover',
    'button/active',
    'button/disabled',
    'ink/alpha',
    'ink/on-base',
  ],
  rampTokens: { blue: ['blue/100', 'blue/500'] },
  semanticRoleTokens: { foreground: ['text/default'], background: ['surface/base'] },
  stateTokens: {
    active: { 'button/default': 'button/active' },
    disabled: { 'button/default': 'button/disabled' },
    hover: { 'button/default': 'button/hover' },
  },
  surfaceRoleTokens: { canvas: ['surface/base'] },
  themeTokens: { 'surface/base': ['light', 'dark'] },
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
test.each([
  [
    'design.color.syntax-valid',
    { color: '#ffffff', syntax: 'hex' },
    { color: 'white', syntax: 'hex' },
  ],
  ['design.color.token-exists', { token: 'text/default' }, { token: 'text/missing' }],
  ['design.color.token-allowed', { token: 'text/default' }, { token: 'button/default' }],
  [
    'design.color.semantic-role',
    { role: 'foreground', token: 'text/default' },
    { role: 'foreground', token: 'surface/base' },
  ],
  [
    'design.color.literal-drift',
    { literal: '#ffffff', token: 'surface/base' },
    { literal: '#ffffff', token: 'text/default' },
  ],
  [
    'design.color.ramp-consistency',
    { ramp: 'blue', tokens: ['blue/100', 'blue/500'] },
    { ramp: 'blue', tokens: ['blue/500', 'blue/100'] },
  ],
  [
    'design.color.alpha-composition',
    { foreground: 'ink/alpha', backdrop: 'surface/base', composite: 'ink/on-base' },
    { foreground: 'ink/alpha', backdrop: 'surface/base', composite: 'text/default' },
  ],
  [
    'design.color.surface-role',
    { surface: 'canvas', token: 'surface/base' },
    { surface: 'canvas', token: 'text/default' },
  ],
  [
    'design.color.hover-state',
    { baseToken: 'button/default', stateToken: 'button/hover' },
    { baseToken: 'button/default', stateToken: 'button/active' },
  ],
  [
    'design.color.active-state',
    { baseToken: 'button/default', stateToken: 'button/active' },
    { baseToken: 'button/default', stateToken: 'button/hover' },
  ],
  [
    'design.color.disabled-state',
    { baseToken: 'button/default', stateToken: 'button/disabled' },
    { baseToken: 'button/default', stateToken: 'button/default' },
  ],
  [
    'design.color.theme-coverage',
    { token: 'surface/base', themes: ['light', 'dark'] },
    { token: 'surface/missing', themes: ['light'] },
  ],
] as const)(
  '%s assesses raw semantic observations and ignores adapter verdicts',
  (ruleId, passing, failing) => {
    const pass = evaluate(ruleId, [
      fact(ruleId, { ...passing, outcome: 'fail', subject: { id: 'button', kind: 'component' } }),
    ]);
    const fail = evaluate(ruleId, [
      fact(ruleId, { ...failing, outcome: 'pass', subject: { id: 'button', kind: 'component' } }),
    ]);
    expect([pass.results[0]?.status, fail.results[0]?.status]).toEqual(['PASS', 'FAIL']);
  },
);
test.each(['#12', '#12345', '#1234567', '#123456789'])(
  'rejects unsupported hexadecimal digit lengths: %s',
  (color) => {
    expect(
      evaluate('design.color.syntax-valid', [
        fact('design.color.syntax-valid', {
          color,
          subject: { id: 'button', kind: 'component' },
          syntax: 'hex',
        }),
      ]).results[0]?.status,
    ).toBe('FAIL');
  },
);
test('rejects unsupported configured Color syntax formats before evaluation', () => {
  expect(() => createColorRuleSet({ ...policy, allowedColorSyntaxes: ['hex', 'rgb'] })).toThrow(
    'Color rule policy must define complete acceptance and coverage configuration.',
  );
});
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
test('requires every configured scope per breakpoint and theme while keeping multiple local samples advisory', () => {
  const result = evaluate('design.color.usage-distribution', [distribution('page')], {
    ...policy,
    requiredScopes: ['page', 'viewport', 'scroll-sample'],
  });
  expect(result.results[0]?.status).toBe('INCOMPLETE');
  const isolated = evaluate(
    'design.color.usage-distribution',
    [
      distribution('page'),
      distribution('viewport', { accent: 50, base: 30, secondary: 20 }, 'hero'),
      distribution('viewport', { accent: 50, base: 30, secondary: 20 }, 'pricing'),
      distribution('scroll-sample', { accent: 50, base: 30, secondary: 20 }, 'footer'),
      distribution('scroll-sample', { accent: 50, base: 30, secondary: 20 }, 'testimonials'),
    ],
    { ...policy, requiredScopes: ['page', 'viewport', 'scroll-sample'] },
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
function fact(kind: string, value: JsonValue): AvailableFactEnvelope {
  return envelope(kind, value);
}
function distribution(
  coverageScope: string,
  roles = { accent: 10, base: 60, secondary: 30 },
  scopeId = 'page',
  breakpointId = 'desktop',
  themeId = 'light',
): AvailableFactEnvelope {
  return envelope('design.color.usage-distribution', {
    breakpointId,
    measuredPixels: 100,
    rolePixels: { ...roles, unknown: 0 },
    scope: coverageScope,
    scopeId,
    themeId,
    unknownPixels: 0,
  });
}
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
