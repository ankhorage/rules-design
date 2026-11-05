import type { FactEnvelope } from '@ankhorage/contracts/rules';
import type { Rule, RuleEvaluationInput, RuleFinding, RuleScope } from '@ankhorage/rules';
import { isRecord } from '@ankhorage/utility/object';

/*** Supplies portable layout facts to the Alignment and Layout rule family. */
export interface AlignmentRuleContext {
  readonly facts: readonly FactEnvelope[];
}

interface AlignmentMetric {
  readonly expected: number;
  readonly measurement: string;
  readonly observed: number;
  readonly subjectIds: readonly string[];
  readonly tolerance: number;
}

interface AlignmentRuleDefinition {
  readonly assessment: 'heuristic' | 'objective';
  readonly capability: string;
  readonly id: string;
  readonly measurement: string;
  readonly summary: string;
}

const definitions: readonly AlignmentRuleDefinition[] = [
  metricRule('design.alignment.shared-edges', 'edge-offset', 'Shared visual edges align.'),
  metricRule('design.alignment.grid-tracks', 'grid-track-offset', 'Elements follow grid tracks.'),
  metricRule('design.alignment.baselines', 'baseline-offset', 'Typical baselines align.'),
  metricRule(
    'design.alignment.text',
    'text-alignment-offset',
    'Text alignment is intentional and consistent.',
  ),
  metricRule(
    'design.alignment.flex-items',
    'flex-alignment-offset',
    'Flex alignment follows its defined pattern.',
  ),
  metricRule(
    'design.alignment.component-axes',
    'component-axis-offset',
    'Equivalent components share axes.',
  ),
  metricRule(
    'design.layout.container-width',
    'container-width-deviation',
    'Container widths obey configured bounds.',
  ),
  metricRule('design.layout.grid-gap', 'grid-gap-deviation', 'Grid gaps follow the system.'),
  {
    ...metricRule(
      'design.layout.horizontal-overflow',
      'horizontal-overflow',
      'Unexpected horizontal overflow is absent.',
    ),
    capability: 'viewport.layout',
  },
  metricRule(
    'design.layout.vertical-clipping',
    'vertical-clipping',
    'Unexpected vertical clipping is absent.',
  ),
  metricRule('design.layout.unintended-overlap', 'overlap-area', 'Unexpected overlap is absent.'),
  {
    ...metricRule(
      'design.layout.unnecessary-wrapper',
      'avoidable-wrapper-count',
      'Avoidable structural wrappers are identified.',
    ),
    assessment: 'heuristic',
  },
  {
    ...metricRule(
      'design.layout.visual-balance',
      'visual-weight-imbalance',
      'Visual weight is balanced.',
    ),
    assessment: 'heuristic',
    capability: 'rendered.area-analysis',
  },
];

/*** Creates the independently registrable Alignment and Layout rules without mutating a provider registry. */
export function createAlignmentRules(): readonly Rule<AlignmentRuleContext>[] {
  return definitions.map(createAlignmentRule);
}

/*** Creates one pure rule from its frozen catalog definition. */
function createAlignmentRule(definition: AlignmentRuleDefinition): Rule<AlignmentRuleContext> {
  return {
    defaultSeverity: definition.assessment === 'objective' ? 'warning' : 'info',
    dependencies: [],
    evaluate: (input) => evaluateAlignmentMetric(definition, input),
    facets: [
      { id: 'assessment', value: definition.assessment },
      { id: 'group', value: 'alignment-layout' },
      { id: 'measurement', value: definition.measurement },
    ],
    identity: { id: definition.id, version: '1.0.0' },
    requiredCapabilities: [definition.capability],
    summary: definition.summary,
  };
}

/*** Evaluates the normalized metric for one fact at the exact rule scope. */
function evaluateAlignmentMetric(
  definition: AlignmentRuleDefinition,
  input: RuleEvaluationInput<AlignmentRuleContext>,
) {
  const metric = findAlignmentMetric(input.context.facts, definition, input.scope);
  if (!metric) return incompleteOutcome(definition, input);

  const deviation = Math.abs(metric.observed - metric.expected);
  if (deviation <= metric.tolerance) return { findings: [], status: 'PASS' as const };

  return { findings: [finding(definition, input, metric, deviation)], status: 'FAIL' as const };
}

/*** Finds one unambiguous, valid metric fact at the exact active Rules scope. */
function findAlignmentMetric(
  facts: readonly FactEnvelope[],
  definition: AlignmentRuleDefinition,
  scope: RuleScope,
): AlignmentMetric | undefined {
  const matchingFacts = facts.filter(
    (fact) => fact.kind === definition.id && scopeMatches(fact.scope, scope),
  );
  const metrics = matchingFacts.map((fact) =>
    fact.status === 'available' ? parseMetric(fact.value, definition.measurement) : undefined,
  );
  const [metric, ...otherMetrics] = metrics;

  if (!metric || otherMetrics.some((otherMetric) => !sameMetric(metric, otherMetric))) {
    return undefined;
  }

  return metric;
}

/*** Compares the full Rules scope rather than accepting another scope with the same identifier. */
function scopeMatches(factScope: FactEnvelope['scope'], scope: RuleScope): boolean {
  return factScope.id === scope.id && factScope.kind === scope.kind;
}

/*** Validates the group-local serializable metric payload without trusting a host adapter. */
function parseMetric(value: unknown, measurement: string): AlignmentMetric | undefined {
  if (!isRecord(value)) return undefined;
  const { expected, measurement: candidateMeasurement, observed, subjectIds, tolerance } = value;
  if (
    typeof expected !== 'number' ||
    !Number.isFinite(expected) ||
    candidateMeasurement !== measurement ||
    typeof observed !== 'number' ||
    !Number.isFinite(observed) ||
    typeof tolerance !== 'number' ||
    !Number.isFinite(tolerance) ||
    tolerance < 0 ||
    !Array.isArray(subjectIds) ||
    subjectIds.length === 0 ||
    !subjectIds.every((id) => typeof id === 'string' && id.trim().length > 0) ||
    new Set(subjectIds).size !== subjectIds.length
  ) {
    return undefined;
  }
  return { expected, measurement, observed, subjectIds, tolerance };
}

/*** Requires duplicate facts to state the same complete normalized measurement. */
function sameMetric(metric: AlignmentMetric, otherMetric: AlignmentMetric | undefined): boolean {
  return (
    otherMetric?.expected === metric.expected &&
    metric.measurement === otherMetric.measurement &&
    metric.observed === otherMetric.observed &&
    metric.tolerance === otherMetric.tolerance &&
    metric.subjectIds.length === otherMetric.subjectIds.length &&
    metric.subjectIds.every((subjectId, index) => subjectId === otherMetric.subjectIds.at(index))
  );
}

/*** Produces an explicit incomplete result when an adapter supplied no usable metric. */
function incompleteOutcome(
  definition: AlignmentRuleDefinition,
  input: RuleEvaluationInput<AlignmentRuleContext>,
) {
  return {
    findings: [
      {
        evidence: { scopeId: input.scope.id },
        message: `${definition.summary} No available normalized metric was supplied for this scope.`,
        ruleId: definition.id,
        severity: 'info' as const,
        subjects: [{ id: input.scope.id, kind: input.scope.kind }],
      },
    ],
    status: 'INCOMPLETE' as const,
  };
}

/*** Describes a metric deviation with the supplied serializable evidence. */
function finding(
  definition: AlignmentRuleDefinition,
  input: RuleEvaluationInput<AlignmentRuleContext>,
  metric: AlignmentMetric,
  deviation: number,
): RuleFinding {
  return {
    evidence: {
      deviation,
      expected: metric.expected,
      observed: metric.observed,
      tolerance: metric.tolerance,
    },
    message: `${definition.summary} Observed deviation ${deviation} exceeds tolerance ${metric.tolerance}.`,
    ruleId: definition.id,
    severity: definition.assessment === 'objective' ? 'warning' : 'info',
    subjects: metric.subjectIds.map((id) => ({ id, kind: input.scope.kind })),
  };
}

/*** Builds one objective layout metric rule definition. */
function metricRule(id: string, measurement: string, summary: string): AlignmentRuleDefinition {
  return { assessment: 'objective', capability: 'dom.layout', id, measurement, summary };
}
