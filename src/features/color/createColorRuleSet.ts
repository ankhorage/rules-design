import type { FactEnvelope } from '@ankhorage/contracts/rules';
import type { JsonValue, Rule, RuleEvaluationInput, RuleFinding, RuleSet } from '@ankhorage/rules';
import { isRecord } from '@ankhorage/utility/object';

import type { DesignContext } from '../../types/designRuleProvider.js';
import { type ColorRulePolicy, createColorPolicyRules } from './createColorPolicyRules.js';

export type { ColorRulePolicy } from './createColorPolicyRules.js';

type Role = 'accent' | 'base' | 'secondary';
type CoverageScope = 'page' | 'scroll-sample' | 'viewport';
interface RoleValues {
  readonly [key: string]: JsonValue;
  readonly accent: number;
  readonly base: number;
  readonly secondary: number;
}
interface Observation {
  readonly breakpointId: string;
  readonly measuredPixels: number;
  readonly rolePixels: RoleValues & { readonly unknown: number };
  readonly scope: CoverageScope;
  readonly scopeId: string;
  readonly themeId: string;
  readonly unknownPixels: number;
}
/*** Creates the isolated Color and Tokens contribution without central registration. */
export function createColorRuleSet(policy: ColorRulePolicy): RuleSet<DesignContext> {
  return {
    id: 'ankhorage.rules-design.color',
    rules: [...createColorPolicyRules(policy), createUsageRule(policy)],
  };
}

/*** Evaluates rendered color areas against provider-owned targets and tolerances. */
function createUsageRule(policy: ColorRulePolicy): Rule<DesignContext> {
  return {
    defaultSeverity: 'warning',
    dependencies: [],
    evaluate: (input) => evaluateUsage(input, policy),
    identity: { id: 'design.color.usage-distribution', version: '1.0.0' },
    requiredCapabilities: ['rendered.area-analysis'],
    summary:
      'Compare separately measured rendered color-role areas with the configured distribution.',
  };
}

/*** Keeps exact rule scope, breakpoint, theme, and coverage measurements isolated. */
function evaluateUsage(input: RuleEvaluationInput<DesignContext>, policy: ColorRulePolicy) {
  const facts = input.context.facts.filter(
    (fact) => fact.kind === 'design.color.usage-distribution' && exactScope(fact, input),
  );
  const observations = facts.map(parseObservation);
  if (facts.length === 0 || observations.some((value) => value === undefined))
    return incomplete(input, 'No complete normalized rendered-area fact was supplied.');
  const complete = observations.filter(isObservation);
  const missing = missingCoverage(complete, policy);
  if (missing.length > 0)
    return incomplete(
      input,
      `Required rendered-area scope measurements are missing: ${missing.join(', ')}.`,
    );
  const page = complete.filter((observation) => observation.scope === 'page');
  const failures = page.flatMap((observation) =>
    deviations(observation, policy).map((value) => finding(value, 'warning')),
  );
  const diagnostics = complete
    .filter((observation) => observation.scope !== 'page')
    .flatMap((observation) =>
      deviations(observation, policy).map((value) => finding(value, 'info')),
    );
  return {
    findings: [...failures, ...diagnostics],
    status: failures.length === 0 ? ('PASS' as const) : ('FAIL' as const),
  };
}
/*** Requires configured coverage for every breakpoint and theme without merging local samples. */
function missingCoverage(
  observations: readonly Observation[],
  policy: ColorRulePolicy,
): readonly string[] {
  return policy.requiredBreakpointIds.flatMap((breakpointId) =>
    policy.requiredThemeIds.flatMap((themeId) =>
      policy.requiredScopes.flatMap((scope) =>
        hasRequiredCoverage(observations, breakpointId, themeId, scope)
          ? []
          : [`${breakpointId}:${themeId}:${scope}`],
      ),
    ),
  );
}
/*** Requires one page assessment and at least one advisory local sample for configured coverage. */
function hasRequiredCoverage(
  observations: readonly Observation[],
  breakpointId: string,
  themeId: string,
  scope: CoverageScope,
): boolean {
  const matching = observations.filter(
    (observation) =>
      observation.breakpointId === breakpointId &&
      observation.themeId === themeId &&
      observation.scope === scope,
  );
  return scope === 'page' ? matching.length === 1 : matching.length > 0;
}
/*** Narrows a parsed observation after incomplete evidence has been rejected. */
function isObservation(observation: Observation | undefined): observation is Observation {
  return observation !== undefined;
}
/*** Validates one available pixel observation including exact total and unknown coverage. */
function parseObservation(fact: FactEnvelope): Observation | undefined {
  if (fact.status !== 'available' || !isRecord(fact.value)) return undefined;
  const { value } = fact;
  const roles = value.rolePixels;
  if (!isRecord(roles)) return undefined;
  const identity = parseIdentity(value);
  const pixels = parsePixels(value, roles);
  if (!identity || !pixels) return undefined;
  const total = pixels.base + pixels.secondary + pixels.accent + pixels.unknown;
  return total === pixels.measuredPixels &&
    pixels.measuredPixels > 0 &&
    pixels.unknown === pixels.unknownPixels &&
    pixels.unknownPixels === 0
    ? {
        ...identity,
        rolePixels: pixels,
        measuredPixels: pixels.measuredPixels,
        unknownPixels: pixels.unknownPixels,
      }
    : undefined;
}
/*** Parses the immutable breakpoint, theme, and coverage identity. */
function parseIdentity(value: Readonly<Record<string, unknown>>):
  | {
      readonly breakpointId: string;
      readonly scope: CoverageScope;
      readonly scopeId: string;
      readonly themeId: string;
    }
  | undefined {
  return text(value.breakpointId) &&
    text(value.themeId) &&
    text(value.scopeId) &&
    isCoverageScope(value.scope)
    ? {
        breakpointId: value.breakpointId,
        scope: value.scope,
        scopeId: value.scopeId,
        themeId: value.themeId,
      }
    : undefined;
}
/*** Parses exclusive integer pixel counters without accepting partial coverage. */
function parsePixels(
  value: Readonly<Record<string, unknown>>,
  roles: Readonly<Record<string, unknown>>,
):
  | {
      readonly accent: number;
      readonly base: number;
      readonly measuredPixels: number;
      readonly secondary: number;
      readonly unknown: number;
      readonly unknownPixels: number;
    }
  | undefined {
  const { measuredPixels, unknownPixels } = value;
  const { accent, base, secondary, unknown } = roles;
  return pixel(measuredPixels) &&
    pixel(unknownPixels) &&
    pixel(accent) &&
    pixel(base) &&
    pixel(secondary) &&
    pixel(unknown)
    ? { accent, base, measuredPixels, secondary, unknown, unknownPixels }
    : undefined;
}
/*** Produces deviations only when the provider-owned tolerance is exceeded. */
function deviations(observation: Observation, policy: ColorRulePolicy) {
  return [
    deviation(
      'base',
      observation.rolePixels.base,
      observation,
      policy.roleTargets.base,
      policy.roleTolerances.base,
    ),
    deviation(
      'secondary',
      observation.rolePixels.secondary,
      observation,
      policy.roleTargets.secondary,
      policy.roleTolerances.secondary,
    ),
    deviation(
      'accent',
      observation.rolePixels.accent,
      observation,
      policy.roleTargets.accent,
      policy.roleTolerances.accent,
    ),
  ].flatMap((value) => (value === undefined ? [] : [value]));
}
/*** Produces one deviation when a measured role exceeds its configured tolerance. */
function deviation(
  role: Role,
  pixels: number,
  observation: Observation,
  target: number,
  tolerance: number,
) {
  const observed = pixels / observation.measuredPixels;
  return Math.abs(observed - target) > tolerance
    ? { observation, observed, role, target, tolerance }
    : undefined;
}
/*** Creates a full-evidence finding while retaining advisory viewport and scroll results. */
function finding(
  value: {
    readonly observation: Observation;
    readonly observed: number;
    readonly role: Role;
    readonly target: number;
    readonly tolerance: number;
  },
  severity: 'info' | 'warning',
): RuleFinding {
  return {
    evidence: {
      breakpointId: value.observation.breakpointId,
      observed: value.observed,
      role: value.role,
      scope: value.observation.scope,
      scopeId: value.observation.scopeId,
      target: value.target,
      themeId: value.observation.themeId,
      tolerance: value.tolerance,
      unknownPixels: value.observation.unknownPixels,
    },
    message: `${value.role} occupies ${value.observed} of ${value.observation.scope}, outside its configured tolerance.`,
    ruleId: 'design.color.usage-distribution',
    severity,
    subjects: [{ id: value.observation.scopeId, kind: 'rendered-color-scope' }],
  };
}
/*** Reports missing evidence without allowing a partial page to pass. */
function incomplete(input: RuleEvaluationInput<DesignContext>, message: string) {
  return {
    findings: [
      {
        evidence: { scopeId: input.scope.id },
        message,
        ruleId: 'design.color.usage-distribution',
        severity: 'info' as const,
        subjects: [{ id: input.scope.id, kind: input.scope.kind }],
      },
    ],
    status: 'INCOMPLETE' as const,
  };
}
/*** Compares the complete active Rules scope rather than only its identifier. */
function exactScope(fact: FactEnvelope, input: RuleEvaluationInput<DesignContext>): boolean {
  return fact.scope.id === input.scope.id && fact.scope.kind === input.scope.kind;
}
/*** Narrows a non-empty identifier. */
function text(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}
/*** Narrows a non-negative integer pixel count. */
function pixel(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}
/*** Narrows coverage scope vocabulary. */
function isCoverageScope(value: unknown): value is CoverageScope {
  return value === 'page' || value === 'scroll-sample' || value === 'viewport';
}
