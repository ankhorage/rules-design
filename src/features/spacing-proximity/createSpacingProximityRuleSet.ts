import type { FactEnvelope } from '@ankhorage/contracts/rules';
import type { Rule, RuleEvaluationOutcome, RuleFacet, RuleScope, RuleSet } from '@ankhorage/rules';

/*** Creates the independently owned Spacing and Proximity Rules contribution. */
export function createSpacingProximityRuleSet(): RuleSet<readonly FactEnvelope[]> {
  return {
    id: 'ankhorage.rules-design.spacing-proximity',
    rules: ruleDefinitions.map(createSpacingProximityRule),
  };
}

type ObservationOutcome = 'fail' | 'incomplete' | 'pass';

interface SpacingProximityObservation {
  readonly detail: string;
  readonly outcome: ObservationOutcome;
  readonly ruleId: string;
}

interface SpacingProximityMeasurements {
  readonly evaluations: readonly SpacingProximityObservation[];
  readonly schemaVersion: 1;
}

interface RuleDefinition {
  readonly capability: string;
  readonly id: string;
  readonly scopeKind: 'component' | 'project';
  readonly severity: 'error' | 'warning';
  readonly summary: string;
  readonly topic: 'proximity' | 'spacing';
}

const measurementsFactKind = 'design.spacing-proximity.measurements';

const ruleDefinitions: readonly RuleDefinition[] = (
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
    id: string,
    capability: string,
    scopeKind: RuleDefinition['scopeKind'],
    severity: RuleDefinition['severity'],
    topic: RuleDefinition['topic'],
  ])[]
).map(([id, capability, scopeKind, severity, topic]) => ({
  capability,
  id,
  scopeKind,
  severity,
  summary: `Evaluate ${id} from supplied measured facts.`,
  topic,
}));

/*** Creates one deterministic rule from its frozen catalog definition. */
function createSpacingProximityRule(definition: RuleDefinition): Rule<readonly FactEnvelope[]> {
  return {
    defaultSeverity: definition.severity,
    dependencies: [],
    evaluate: ({ context, scope }) => evaluateSpacingProximityRule(context, definition, scope),
    facets: createRuleFacets(definition),
    identity: { id: definition.id, version: '1.0.0' },
    requiredCapabilities: [definition.capability],
    summary: definition.summary,
  };
}

/*** Evaluates one rule only from a matching immutable portable measurements fact. */
function evaluateSpacingProximityRule(
  facts: readonly FactEnvelope[],
  definition: RuleDefinition,
  scope: RuleScope,
): RuleEvaluationOutcome {
  const fact = facts.find(
    (candidate) =>
      candidate.kind === measurementsFactKind &&
      candidate.scope.id === scope.id &&
      candidate.scope.kind === scope.kind,
  );
  if (fact === undefined) return incomplete();
  if (fact.status === 'missing') return incomplete();
  const measurements = parseMeasurements(fact.value);
  if (measurements === null) return incomplete();
  const observation = measurements.evaluations.find(
    (candidate) => candidate.ruleId === definition.id,
  );
  if (observation === undefined || observation.outcome === 'incomplete') return incomplete();
  if (observation.outcome === 'pass') return { findings: [], status: 'PASS' };
  return {
    findings: [
      {
        evidence: { detail: observation.detail, factId: fact.id, scopeId: scope.id },
        message: observation.detail,
        ruleId: definition.id,
        severity: definition.severity,
        subjects: [{ id: scope.id, kind: scope.kind }],
      },
    ],
    status: 'FAIL',
  };
}

/*** Produces an incomplete result whenever factual measurements cannot be established. */
function incomplete(): RuleEvaluationOutcome {
  return { findings: [], status: 'INCOMPLETE' };
}

/*** Creates controlled rule facets for capability consumers and catalog queries. */
function createRuleFacets(definition: RuleDefinition): readonly RuleFacet[] {
  return [
    { id: 'principle', value: 'proximity' },
    { id: 'scope', value: definition.scopeKind },
    { id: 'topic', value: definition.topic },
  ];
}

/*** Parses only the frozen serializable measurements shape supplied by fact adapters. */
function parseMeasurements(value: unknown): SpacingProximityMeasurements | null {
  if (!isRecord(value) || value.schemaVersion !== 1 || !Array.isArray(value.evaluations))
    return null;
  const evaluations = value.evaluations.map(parseObservation);
  const observations = evaluations.filter(
    (evaluation): evaluation is SpacingProximityObservation => evaluation !== null,
  );
  return observations.length === evaluations.length
    ? { evaluations: observations, schemaVersion: 1 }
    : null;
}

/*** Parses one fact observation without accepting an implicit or untyped outcome. */
function parseObservation(value: unknown): SpacingProximityObservation | null {
  if (
    !isRecord(value) ||
    typeof value.detail !== 'string' ||
    typeof value.ruleId !== 'string' ||
    !isObservationOutcome(value.outcome)
  ) {
    return null;
  }
  return { detail: value.detail, outcome: value.outcome, ruleId: value.ruleId };
}

/*** Narrows a serializable unknown value to a record without assuming a prototype. */
function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/*** Narrows the only outcomes permitted by the frozen measurements schema. */
function isObservationOutcome(value: unknown): value is ObservationOutcome {
  return value === 'fail' || value === 'incomplete' || value === 'pass';
}
