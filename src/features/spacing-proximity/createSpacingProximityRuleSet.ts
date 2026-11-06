import type { FactEnvelope } from '@ankhorage/contracts/rules';
import type { Rule, RuleEvaluationOutcome, RuleFacet, RuleScope, RuleSet } from '@ankhorage/rules';

import type { DesignContext } from '../../types/designRuleProvider';
import type { SpacingProximityRuleId } from '../../types/spacingProximity';
import { assessSpacingProximityObservation } from './assessSpacingProximityObservation';
import { parseSpacingProximityMeasurements } from './parseSpacingProximityMeasurements';

/*** Creates the independently owned Spacing and Proximity Rules contribution. */
export function createSpacingProximityRuleSet(): RuleSet<DesignContext> {
  return { id: 'ankhorage.rules-design.spacing-proximity', rules: definitions.map(createRule) };
}

interface Definition {
  readonly capability: string;
  readonly id: SpacingProximityRuleId;
  readonly scopeKind: 'component' | 'project';
  readonly severity: 'error' | 'warning';
  readonly topic: 'proximity' | 'spacing';
}

const factKind = 'design.spacing-proximity.measurements';

const definitions: readonly Definition[] = (
  [
    ['design.spacing.token-allowed', 'source.style-tokens', 'project', 'error', 'spacing'],
    ['design.spacing.vertical-rhythm', 'dom.layout', 'component', 'error', 'spacing'],
    ['design.spacing.section-gap', 'dom.layout', 'component', 'error', 'spacing'],
    ['design.spacing.container-padding', 'dom.layout', 'component', 'error', 'spacing'],
    ['design.proximity.related-grouping', 'dom.layout', 'component', 'warning', 'proximity'],
    ['design.proximity.unrelated-separation', 'dom.layout', 'component', 'warning', 'proximity'],
    ['design.proximity.label-control', 'dom.layout', 'component', 'error', 'proximity'],
    ['design.proximity.heading-content', 'dom.layout', 'component', 'error', 'proximity'],
    ['design.proximity.card-internals', 'dom.layout', 'component', 'error', 'proximity'],
    ['design.spacing.double-application', 'dom.layout', 'component', 'error', 'spacing'],
    ['design.spacing.unexpected-collapse', 'dom.layout', 'component', 'error', 'spacing'],
  ] satisfies readonly (readonly [
    SpacingProximityRuleId,
    string,
    Definition['scopeKind'],
    Definition['severity'],
    Definition['topic'],
  ])[]
).map(([id, capability, scopeKind, severity, topic]) => ({
  capability,
  id,
  scopeKind,
  severity,
  topic,
}));

/*** Creates one deterministic rule from its frozen catalog definition. */
function createRule(definition: Definition): Rule<DesignContext> {
  return {
    defaultSeverity: definition.severity,
    dependencies: [],
    evaluate: ({ context, scope }) => evaluate(context.facts, definition, scope),
    facets: facets(definition),
    identity: { id: definition.id, version: '1.0.0' },
    requiredCapabilities: [definition.capability],
    summary: `Evaluate ${definition.id} from supplied normalized measurements.`,
  };
}

/*** Evaluates one rule from normalized evidence, never from an adapter-supplied verdict. */
function evaluate(
  facts: readonly FactEnvelope[],
  definition: Definition,
  scope: RuleScope,
): RuleEvaluationOutcome {
  const fact = matchingFact(facts, scope);
  if (fact === null || fact.status === 'missing') return incomplete();
  const observations = parseSpacingProximityMeasurements(fact.value)?.filter(
    (candidate) => candidate.kind === definition.id,
  );
  if (observations === undefined || observations.length === 0) return incomplete();
  const assessments = observations.map(assessSpacingProximityObservation);
  if (assessments.some((assessment) => assessment === undefined)) return incomplete();
  const failures = assessments.filter(
    (assessment): assessment is NonNullable<typeof assessment> => assessment !== null,
  );
  if (failures.length === 0) return { findings: [], status: 'PASS' };
  return failures.length === assessments.length
    ? failed(definition, fact, scope, failures)
    : incomplete();
}

/*** Selects exactly one scope-local fact to prevent ambiguous evidence from passing. */
function matchingFact(facts: readonly FactEnvelope[], scope: RuleScope): FactEnvelope | null {
  const matches = facts.filter(
    (fact) =>
      fact.kind === factKind && fact.scope.id === scope.id && fact.scope.kind === scope.kind,
  );
  return matches.length === 1 ? (matches[0] ?? null) : null;
}

/*** Produces an evidence-backed failure without accepting an adapter-provided pass or fail state. */
function failed(
  definition: Definition,
  fact: FactEnvelope,
  scope: RuleScope,
  failures: readonly { readonly message: string; readonly values: readonly number[] }[],
): RuleEvaluationOutcome {
  return {
    findings: failures.map((failure) => ({
      evidence: { factId: fact.id, scopeId: scope.id, values: failure.values },
      message: failure.message,
      ruleId: definition.id,
      severity: definition.severity,
      subjects: [{ id: scope.id, kind: scope.kind }],
    })),
    status: 'FAIL',
  };
}

/*** Produces an incomplete result whenever factual measurements cannot be established. */
function incomplete(): RuleEvaluationOutcome {
  return { findings: [], status: 'INCOMPLETE' };
}

/*** Creates controlled rule facets for capability consumers and catalog queries. */
function facets(definition: Definition): readonly RuleFacet[] {
  return [
    { id: 'principle', value: 'proximity' },
    { id: 'scope', value: definition.scopeKind },
    { id: 'topic', value: definition.topic },
  ];
}
