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
interface ColorObservation {
  readonly actual: JsonValue;
  readonly expected: JsonValue;
  readonly subject: RuleSubject;
}

/*** Creates the twelve frozen Color and Tokens policy rules from normalized observations. */
export function createColorPolicyRules(): readonly Rule<DesignContext>[] {
  return policyRuleIds.map(createColorPolicyRule);
}

/*** Creates one rule whose result is assessed by this provider, never by an adapter verdict. */
function createColorPolicyRule(ruleId: ColorPolicyRuleId): Rule<DesignContext> {
  return {
    defaultSeverity: 'warning',
    dependencies: [],
    evaluate: (input) => evaluateColorPolicyRule(ruleId, input),
    identity: { id: ruleId, version: '1.0.0' },
    requiredCapabilities: ['design.color-policy-facts'],
    summary: colorPolicySummary(ruleId),
  };
}

/*** Assesses every exact-scope observation against its expected normalized value. */
function evaluateColorPolicyRule(
  ruleId: ColorPolicyRuleId,
  input: RuleEvaluationInput<DesignContext>,
) {
  const facts = (input.context.facts ?? []).filter(
    (fact) => fact.kind === ruleId && sameScope(fact, input),
  );
  const observations = facts.map((fact) => ({ fact, observation: parseObservation(fact) }));
  if (facts.length === 0 || observations.some(({ observation }) => observation === undefined))
    return incomplete(ruleId, input);
  const findings = observations.flatMap(({ fact, observation }) =>
    observation !== undefined && !isDeepStrictEqual(observation.actual, observation.expected)
      ? [finding(ruleId, fact, observation)]
      : [],
  );
  return { findings, status: findings.length === 0 ? ('PASS' as const) : ('FAIL' as const) };
}

/*** Accepts facts only from the complete active Rules scope. */
function sameScope(fact: FactEnvelope, input: RuleEvaluationInput<DesignContext>): boolean {
  return fact.scope.id === input.scope.id && fact.scope.kind === input.scope.kind;
}
/*** Parses an available factual observation while ignoring adapter-supplied verdict fields. */
function parseObservation(fact: FactEnvelope): ColorObservation | undefined {
  if (fact.status !== 'available' || !isRecord(fact.value)) return undefined;
  const { actual, expected, subject } = fact.value;
  return isJsonValue(actual) && isJsonValue(expected) && isSubject(subject)
    ? { actual, expected, subject }
    : undefined;
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
    evidence: { actual: observation.actual, expected: observation.expected, factId: fact.id },
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
