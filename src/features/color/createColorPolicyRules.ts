import type { FactEnvelope } from '@ankhorage/contracts/rules';
import type { JsonValue, Rule, RuleEvaluationInput, RuleSubject } from '@ankhorage/rules';
import { isRecord } from '@ankhorage/utility/object';

import type { ColorPolicyRuleId, ColorRulePolicy } from '../../types/color';
import type { DesignContext } from '../../types/designRuleProvider';
import { colorObservationValues } from './colorObservationValues';
import { evaluateColorPolicyObservation } from './evaluateColorPolicyObservation';
import { isColorRulePolicy } from './isColorRulePolicy';

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
] as const satisfies readonly ColorPolicyRuleId[];
interface ColorObservation {
  readonly subject: RuleSubject;
  readonly value: Readonly<Record<string, JsonValue>>;
}
const { text } = colorObservationValues;

export type { ColorRulePolicy } from '../../types/color';

/*** Creates the twelve frozen Color and Tokens policy rules from normalized raw observations. */
export function createColorPolicyRules(policy: ColorRulePolicy): readonly Rule<DesignContext>[] {
  validateColorRulePolicy(policy);
  return policyRuleIds.map((ruleId) => createColorPolicyRule(ruleId, policy));
}

/*** Rejects malformed trusted policy before Color rules can produce ambiguous verdicts. */
function validateColorRulePolicy(policy: ColorRulePolicy): void {
  if (!isColorRulePolicy(policy))
    throw new Error(
      'Color rule policy must define complete acceptance and coverage configuration.',
    );
}

/*** Constructs one fact-driven atomic rule without trusting adapter verdict fields. */
function createColorPolicyRule(
  ruleId: ColorPolicyRuleId,
  policy: ColorRulePolicy,
): Rule<DesignContext> {
  return {
    defaultSeverity: 'warning',
    dependencies: [],
    evaluate: (input) => evaluateColorPolicyRule(ruleId, policy, input),
    identity: { id: ruleId, version: '1.0.0' },
    requiredCapabilities: ['design.color-policy-facts'],
    summary: colorPolicySummary(ruleId),
  };
}

/*** Assesses each normalized raw observation with the rule-specific trusted policy. */
function evaluateColorPolicyRule(
  ruleId: ColorPolicyRuleId,
  policy: ColorRulePolicy,
  input: RuleEvaluationInput<DesignContext>,
) {
  const facts = (input.context.facts ?? []).filter(
    (fact) => fact.kind === ruleId && sameScope(fact, input),
  );
  const observations = facts.map((fact) => ({ fact, observation: parseObservation(fact) }));
  if (facts.length === 0 || observations.some(({ observation }) => observation === undefined))
    return incomplete(ruleId, input);
  const assessments = observations.flatMap(({ fact, observation }) =>
    observation === undefined
      ? []
      : [
          {
            fact,
            observation,
            verdict: evaluateColorPolicyObservation(ruleId, observation.value, policy),
          },
        ],
  );
  if (assessments.some(({ verdict }) => verdict === 'INCOMPLETE')) return incomplete(ruleId, input);
  const findings = assessments.flatMap(({ fact, observation, verdict }) =>
    verdict === 'FAIL' ? [finding(ruleId, fact, observation)] : [],
  );
  return { findings, status: findings.length === 0 ? ('PASS' as const) : ('FAIL' as const) };
}

/*** Accepts facts only from the complete active Rules scope. */
function sameScope(fact: FactEnvelope, input: RuleEvaluationInput<DesignContext>): boolean {
  return fact.scope.id === input.scope.id && fact.scope.kind === input.scope.kind;
}

/*** Parses available raw evidence while ignoring adapter-supplied verdict fields. */
function parseObservation(fact: FactEnvelope): ColorObservation | undefined {
  if (fact.status !== 'available' || !isRecord(fact.value) || !isSubject(fact.value.subject))
    return undefined;
  const { subject, ...value } = fact.value;
  return Object.values(value).every(isJsonValue) ? { subject, value } : undefined;
}

/*** Narrows a serializable raw observation field to the Rules JSON vocabulary. */
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

/*** Narrows the observation provenance required for an evidence-backed finding. */
function isSubject(value: unknown): value is RuleSubject {
  return isRecord(value) && text(value.id) && text(value.kind);
}

/*** Reports unavailable or malformed evidence without creating a false pass. */
function incomplete(ruleId: ColorPolicyRuleId, input: RuleEvaluationInput<DesignContext>) {
  return {
    findings: [
      {
        evidence: { scopeId: input.scope.id },
        message: `${colorPolicySummary(ruleId)} No available normalized raw observation was supplied for this exact scope.`,
        ruleId,
        severity: 'info' as const,
        subjects: [{ id: input.scope.id, kind: input.scope.kind }],
      },
    ],
    status: 'INCOMPLETE' as const,
  };
}

/*** Creates an evidence-backed finding from a trusted policy contradiction. */
function finding(ruleId: ColorPolicyRuleId, fact: FactEnvelope, observation: ColorObservation) {
  return {
    evidence: { factId: fact.id, observation: observation.value },
    message: `${colorPolicySummary(ruleId)} Observed raw values contradict the configured policy.`,
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
