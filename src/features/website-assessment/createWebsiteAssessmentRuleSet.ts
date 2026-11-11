import type { FactEnvelope } from '@ankhorage/contracts/rules';
import type { Rule, RuleEvaluationOutcome, RuleScope, RuleSet } from '@ankhorage/rules';
import { isRecord } from '@ankhorage/utility/object';

import type {
  AssessmentDefinition,
  AssessmentFact,
  WebsiteAssessmentContext,
  WebsiteAssessmentRuleOptions,
} from '../../types/websiteAssessment';
import { websiteAssessmentDefinitions } from './websiteAssessmentDefinitions';

/*** Creates the separately composable follow-on website and contact assessment rules. */
export function createWebsiteAssessmentRuleSet(
  options: WebsiteAssessmentRuleOptions = {},
): RuleSet<WebsiteAssessmentContext> {
  return {
    id: 'ankhorage.rules-design.website-assessment',
    rules: websiteAssessmentDefinitions.map((definition) =>
      createWebsiteAssessmentRule(definition, options),
    ),
  };
}

/*** Builds one pure Rules adapter around a typed website assessment. */
function createWebsiteAssessmentRule(
  definition: AssessmentDefinition,
  options: WebsiteAssessmentRuleOptions,
): Rule<WebsiteAssessmentContext> {
  return {
    defaultSeverity: definition.severity,
    dependencies: [],
    evaluate: ({ context, scope }) =>
      evaluateWebsiteAssessmentRule(definition, options, context.facts, scope),
    identity: { id: definition.id, version: '1.0.0' },
    requiredCapabilities: [definition.capability],
    summary: definition.summary,
  };
}

/*** Evaluates exact-scope observations and fails closed for missing or malformed facts. */
function evaluateWebsiteAssessmentRule(
  definition: AssessmentDefinition,
  options: WebsiteAssessmentRuleOptions,
  facts: readonly FactEnvelope[],
  scope: RuleScope,
): RuleEvaluationOutcome {
  const scopedFacts = facts.filter(
    (fact) =>
      fact.kind === definition.factKind &&
      fact.scope.id === scope.id &&
      fact.scope.kind === scope.kind,
  );
  const observations = scopedFacts.flatMap(toAssessmentFact);
  if (scopedFacts.length === 0 || observations.length !== scopedFacts.length)
    return incomplete(definition.id, scope);
  const result = definition.evaluate(observations, options);
  return {
    findings: result.findings.map((finding) => ({
      evidence: finding.evidence,
      message: finding.message,
      ruleId: definition.id,
      severity: result.status === 'FAIL' ? definition.severity : 'info',
      subjects: [finding.subject],
    })),
    status: result.status,
  };
}

/*** Accepts a portable available record only after required fact identity fields are present. */
function toAssessmentFact(fact: FactEnvelope): readonly AssessmentFact[] {
  return fact.status === 'available' &&
    nonEmpty(fact.id) &&
    nonEmpty(fact.contentHash) &&
    isRecord(fact.value)
    ? [{ id: fact.id, value: fact.value }]
    : [];
}

/*** Produces a canonical incomplete outcome without exposing host payloads. */
function incomplete(id: AssessmentDefinition['id'], scope: RuleScope): RuleEvaluationOutcome {
  return {
    findings: [
      {
        evidence: { scopeId: scope.id, scopeKind: scope.kind },
        message: 'Complete validated website assessment observations are unavailable.',
        ruleId: id,
        severity: 'info',
        subjects: [{ id: scope.id, kind: scope.kind }],
      },
    ],
    status: 'INCOMPLETE',
  };
}

/*** Narrows a stable fact identity string. */
function nonEmpty(value: string): boolean {
  return value.trim().length > 0;
}
