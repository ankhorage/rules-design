import type { FactEnvelope } from '@ankhorage/contracts/rules';
import type { Rule, RuleEvaluationOutcome, RuleScope } from '@ankhorage/rules';
import { isRecord } from '@ankhorage/utility/object';

import type { DesignColorPolicyRuleId, DesignContext } from '../../types/designRuleProvider';
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
const factKind = 'design.color-policy.observations';
/*** Creates the twelve frozen Color and Tokens rules from factual observations. */
export function createColorPolicyRules(): readonly Rule<DesignContext>[] {
  return policyRuleIds.map(createColorPolicyRule);
}
/*** Creates one rule whose verdict is derived from raw expected and observed values. */
function createColorPolicyRule(ruleId: DesignColorPolicyRuleId): Rule<DesignContext> {
  return {
    defaultSeverity: 'warning',
    dependencies: [],
    evaluate: ({ context, scope }) => evaluateColorPolicyRule(ruleId, context.facts ?? [], scope),
    identity: { id: ruleId, version: '1.0.0' },
    requiredCapabilities: ['design.color-policy-facts'],
    summary: colorPolicySummary(ruleId),
  };
}
/*** Assesses exactly one scope-local normalized observation rather than an adapter verdict. */
function evaluateColorPolicyRule(
  ruleId: DesignColorPolicyRuleId,
  facts: readonly FactEnvelope[],
  scope: RuleScope,
): RuleEvaluationOutcome {
  const matching = facts.filter((fact) => fact.kind === factKind && sameScope(fact, scope));
  if (matching.length !== 1 || matching[0]?.status !== 'available') return incomplete();
  const observations = parseObservations(matching[0].value);
  const observation = observations?.filter((candidate) => candidate.ruleId === ruleId);
  if (observation?.length !== 1) return incomplete();
  const [value] = observation;
  return value.actual === value.expected
    ? { findings: [], status: 'PASS' }
    : {
        findings: [
          {
            evidence: { actual: value.actual, expected: value.expected, factId: matching[0].id },
            message: `${colorPolicySummary(ruleId)} Expected ${value.expected}; observed ${value.actual}.`,
            ruleId,
            severity: 'warning',
            subjects: [{ id: scope.id, kind: scope.kind }],
          },
        ],
        status: 'FAIL',
      };
}
/*** Parses the versioned adapter observation schema without admitting precomputed outcomes. */
function parseObservations(value: unknown):
  | readonly {
      readonly actual: string;
      readonly expected: string;
      readonly ruleId: DesignColorPolicyRuleId;
    }[]
  | undefined {
  if (!isRecord(value) || value.schemaVersion !== 1 || !Array.isArray(value.observations))
    return undefined;
  const observations = value.observations.map((item) =>
    isRecord(item) &&
    typeof item.actual === 'string' &&
    typeof item.expected === 'string' &&
    isRuleId(item.ruleId)
      ? { actual: item.actual, expected: item.expected, ruleId: item.ruleId }
      : undefined,
  );
  return observations.every((item) => item !== undefined) ? observations : undefined;
}
/*** Confirms that an adapter may name only one of the frozen policy identities. */
function isRuleId(value: unknown): value is DesignColorPolicyRuleId {
  return typeof value === 'string' && policyRuleIds.includes(value as DesignColorPolicyRuleId);
}
/*** Matches a fact only when its complete semantic scope equals this evaluation. */
function sameScope(fact: FactEnvelope, scope: RuleScope): boolean {
  return fact.scope.id === scope.id && fact.scope.kind === scope.kind;
}
/*** Fails closed for missing, ambiguous, or malformed normalized observations. */
function incomplete(): RuleEvaluationOutcome {
  return { findings: [], status: 'INCOMPLETE' };
}
/*** Supplies the catalog-aligned concise summary for each implemented policy rule. */
function colorPolicySummary(ruleId: DesignColorPolicyRuleId): string {
  return `${ruleId.replace('design.color.', '').replaceAll('-', ' ')} follows policy.`;
}
