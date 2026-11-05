import { isDeepStrictEqual } from 'node:util';

import type { FactEnvelope } from '@ankhorage/contracts/rules';
import type { JsonValue, Rule, RuleEvaluationInput, RuleSubject } from '@ankhorage/rules';
import { isRecord } from '@ankhorage/utility/object';

import type { DesignContext } from '../../types/designRuleProvider';

const policyRuleIds = [
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
] as const;
type ColorPolicyRuleId = (typeof policyRuleIds)[number];
type CoverageScope = 'page' | 'scroll-sample' | 'viewport';
interface RoleValues {
  readonly [key: string]: JsonValue;
  readonly accent: number;
  readonly base: number;
  readonly secondary: number;
}
/*** Configures trusted acceptance and coverage policy for the frozen Color rule family. */
export interface ColorRulePolicy {
  readonly acceptedValues: Readonly<Record<ColorPolicyRuleId, JsonValue>>;
  readonly requiredBreakpointIds: readonly string[];
  readonly [key: string]: JsonValue;
  readonly requiredScopes: readonly CoverageScope[];
  readonly requiredThemeIds: readonly string[];
  readonly roleTargets: RoleValues;
  readonly roleTolerances: RoleValues;
  readonly version: number;
}
interface ColorObservation {
  readonly actual: JsonValue;
  readonly subject: RuleSubject;
}

/*** Creates the twelve frozen Color and Tokens policy rules from normalized observations. */
export function createColorPolicyRules(policy: ColorRulePolicy): readonly Rule<DesignContext>[] {
  validateColorRulePolicy(policy);
  return policyRuleIds.map((ruleId) =>
    createColorPolicyRule(ruleId, acceptedValue(policy.acceptedValues, ruleId)),
  );
}

/*** Rejects malformed trusted policy before Color rules can produce ambiguous verdicts. */
function validateColorRulePolicy(policy: ColorRulePolicy): void {
  if (!isColorRulePolicy(policy))
    throw new Error(
      'Color rule policy must define complete acceptance and coverage configuration.',
    );
}

/*** Narrows a complete Color policy with trusted acceptance and coverage values. */
function isColorRulePolicy(value: ColorRulePolicy): boolean {
  return (
    isRecord(value) &&
    value.version === 1 &&
    acceptedValues(value.acceptedValues) &&
    identifiers(value.requiredBreakpointIds) &&
    Array.isArray(value.requiredScopes) &&
    value.requiredScopes.length > 0 &&
    new Set(value.requiredScopes).size === value.requiredScopes.length &&
    value.requiredScopes.every(isCoverageScope) &&
    identifiers(value.requiredThemeIds) &&
    roleMap(value.roleTargets, true) &&
    roleMap(value.roleTolerances, false)
  );
}

/*** Requires exactly one serializable trusted criterion for every frozen atomic rule. */
function acceptedValues(value: unknown): value is Readonly<Record<ColorPolicyRuleId, JsonValue>> {
  return (
    isRecord(value) &&
    Object.keys(value).length === policyRuleIds.length &&
    policyRuleIds.every((ruleId) =>
      Object.entries(value).some(
        ([id, acceptedValue]) => id === ruleId && isJsonValue(acceptedValue),
      ),
    )
  );
}

/*** Requires non-empty unique coverage identifiers. */
function identifiers(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    new Set(value).size === value.length &&
    value.every(text)
  );
}

/*** Checks normalized target or tolerance role maps. */
function roleMap(value: unknown, target: boolean): value is RoleValues {
  if (!isRecord(value)) return false;
  const { accent, base, secondary } = value;
  return (
    proportion(accent) &&
    proportion(base) &&
    proportion(secondary) &&
    (!target || Math.abs(base + secondary + accent - 1) < Number.EPSILON)
  );
}

/*** Narrows a finite role proportion within the supported inclusive range. */
function proportion(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

/*** Narrows a non-empty identifier. */
function text(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

/*** Narrows coverage scope vocabulary. */
function isCoverageScope(value: unknown): value is CoverageScope {
  return value === 'page' || value === 'scroll-sample' || value === 'viewport';
}

/*** Retrieves the prevalidated trusted criterion for one frozen rule identifier. */
function acceptedValue(
  acceptedValues: Readonly<Record<ColorPolicyRuleId, JsonValue>>,
  ruleId: ColorPolicyRuleId,
): JsonValue {
  return Object.entries(acceptedValues).find(([id]) => id === ruleId)?.[1] ?? null;
}

/*** Creates one rule whose result is assessed by this provider, never by an adapter verdict. */
function createColorPolicyRule(
  ruleId: ColorPolicyRuleId,
  acceptedValue: JsonValue,
): Rule<DesignContext> {
  return {
    defaultSeverity: 'warning',
    dependencies: [],
    evaluate: (input) => evaluateColorPolicyRule(ruleId, acceptedValue, input),
    identity: { id: ruleId, version: '1.0.0' },
    requiredCapabilities: ['design.color-policy-facts'],
    summary: colorPolicySummary(ruleId),
  };
}

/*** Assesses every exact-scope observation against its trusted configured value. */
function evaluateColorPolicyRule(
  ruleId: ColorPolicyRuleId,
  acceptedValue: JsonValue,
  input: RuleEvaluationInput<DesignContext>,
) {
  const facts = (input.context.facts ?? []).filter(
    (fact) => fact.kind === ruleId && sameScope(fact, input),
  );
  const observations = facts.map((fact) => ({ fact, observation: parseObservation(fact) }));
  if (facts.length === 0 || observations.some(({ observation }) => observation === undefined))
    return incomplete(ruleId, input);
  const findings = observations.flatMap(({ fact, observation }) =>
    observation !== undefined && !isDeepStrictEqual(observation.actual, acceptedValue)
      ? [finding(ruleId, fact, observation)]
      : [],
  );
  return { findings, status: findings.length === 0 ? ('PASS' as const) : ('FAIL' as const) };
}

/*** Accepts facts only from the complete active Rules scope. */
function sameScope(fact: FactEnvelope, input: RuleEvaluationInput<DesignContext>): boolean {
  return fact.scope.id === input.scope.id && fact.scope.kind === input.scope.kind;
}
/*** Parses an available factual observation while ignoring adapter-supplied acceptance fields. */
function parseObservation(fact: FactEnvelope): ColorObservation | undefined {
  if (fact.status !== 'available' || !isRecord(fact.value)) return undefined;
  const { actual, subject } = fact.value;
  return isJsonValue(actual) && isSubject(subject) ? { actual, subject } : undefined;
}
/*** Narrows a serializable JSON value. */
function isJsonValue(value: unknown): value is JsonValue {
  return (
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'number' ||
    typeof value === 'string' ||
    (Array.isArray(value) && value.every(isJsonValue)) ||
    (isRecord(value) && Object.values(value).every(isJsonValue))
  );
}
/*** Narrows a non-empty subject supplied as observation provenance. */
function isSubject(value: unknown): value is RuleSubject {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    value.id.trim() !== '' &&
    typeof value.kind === 'string' &&
    value.kind.trim() !== ''
  );
}
/*** Reports unavailable or malformed evidence without creating a false pass. */
function incomplete(ruleId: ColorPolicyRuleId, input: RuleEvaluationInput<DesignContext>) {
  return {
    findings: [
      {
        evidence: { scopeId: input.scope.id },
        message: `${colorPolicySummary(ruleId)} No available normalized observation was supplied for this exact scope.`,
        ruleId,
        severity: 'info' as const,
        subjects: [{ id: input.scope.id, kind: input.scope.kind }],
      },
    ],
    status: 'INCOMPLETE' as const,
  };
}
/*** Creates an evidence-backed finding from a provider-owned value comparison. */
function finding(ruleId: ColorPolicyRuleId, fact: FactEnvelope, observation: ColorObservation) {
  return {
    evidence: { actual: observation.actual, factId: fact.id },
    message: `${colorPolicySummary(ruleId)} Observed value does not match the required value.`,
    ruleId,
    severity: 'warning' as const,
    subjects: [observation.subject],
  };
}
/*** Supplies the frozen catalog summary for one Color and Tokens rule. */
function colorPolicySummary(ruleId: ColorPolicyRuleId): string {
  switch (ruleId) {
    case 'design.color.active-state':
      return 'Active color variation follows policy.';
    case 'design.color.alpha-composition':
      return 'Transparency is evaluated against the actual backdrop.';
    case 'design.color.disabled-state':
      return 'Disabled colors communicate disabled state.';
    case 'design.color.hover-state':
      return 'Hover color variation follows policy.';
    case 'design.color.literal-drift':
      return 'Unnecessary literal values do not drift from tokens.';
    case 'design.color.ramp-consistency':
      return 'Defined color ramps remain consistent.';
    case 'design.color.semantic-role':
      return 'Foreground, background, and border roles are semantically correct.';
    case 'design.color.surface-role':
      return 'Surface colors consistently express their role.';
    case 'design.color.syntax-valid':
      return 'Colors are syntactically valid.';
    case 'design.color.theme-coverage':
      return 'Light and dark theme tokens are available.';
    case 'design.color.token-allowed':
      return 'Only permitted palette tokens are used.';
    case 'design.color.token-exists':
      return 'Referenced color tokens exist.';
  }
}
