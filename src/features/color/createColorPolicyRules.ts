import type { Rule, RuleEvaluationOutcome, RuleFinding } from '@ankhorage/rules';

import type {
  DesignColorPolicyFact,
  DesignColorPolicyRuleId,
  DesignContext,
} from '../../types/designRuleProvider';

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

/*** Creates the twelve independent Color and Tokens policy rules from normalized host facts. */
export function createColorPolicyRules(): readonly Rule<DesignContext>[] {
  return policyRuleIds.map(createColorPolicyRule);
}

/*** Creates one evidence-backed atomic policy rule from normalized host facts. */
function createColorPolicyRule(ruleId: DesignColorPolicyRuleId): Rule<DesignContext> {
  return {
    defaultSeverity: 'warning',
    dependencies: [],
    evaluate: ({ context }) => evaluateColorPolicyRule(ruleId, context.colorPolicyFacts ?? []),
    identity: { id: ruleId, version: '1.0.0' },
    requiredCapabilities: ['design.color-policy-facts'],
    summary: colorPolicySummary(ruleId),
  };
}

/*** Evaluates one atomic color policy only when the host supplied its normalized observation. */
function evaluateColorPolicyRule(
  ruleId: DesignColorPolicyRuleId,
  facts: readonly DesignColorPolicyFact[],
): RuleEvaluationOutcome {
  const ruleFacts = facts.filter((fact) => fact.ruleId === ruleId);
  if (ruleFacts.length === 0) {
    return incompleteOutcome(ruleId, 'No normalized color policy fact was supplied.');
  }
  const failedFacts = ruleFacts.filter((fact) => fact.outcome === 'fail');
  return failedFacts.length === 0
    ? { findings: [], status: 'PASS' }
    : { findings: failedFacts.map((fact) => policyFinding(ruleId, fact)), status: 'FAIL' };
}

/*** Creates a deterministic incomplete finding for absent or insufficient evidence. */
function incompleteOutcome(ruleId: string, message: string): RuleEvaluationOutcome {
  return {
    findings: [
      {
        evidence: { reason: message },
        message,
        ruleId,
        severity: 'info',
        subjects: [{ id: 'design-context', kind: 'design-context' }],
      },
    ],
    status: 'INCOMPLETE',
  };
}

/*** Creates a finding from a host-normalized policy violation without mutating its evidence. */
function policyFinding(ruleId: DesignColorPolicyRuleId, fact: DesignColorPolicyFact): RuleFinding {
  return {
    evidence: fact.evidence,
    message: `${colorPolicySummary(ruleId)} Expected ${fact.evidence.expected}; observed ${fact.evidence.actual}.`,
    ruleId,
    severity: 'warning',
    subjects: [{ id: fact.scopeId, kind: 'design-color-scope' }],
  };
}

/*** Supplies the catalog-aligned concise summary for each implemented policy rule. */
function colorPolicySummary(ruleId: DesignColorPolicyRuleId): string {
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
