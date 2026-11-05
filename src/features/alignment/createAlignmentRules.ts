import type { FactEnvelope } from '@ankhorage/contracts/rules';
import type { Rule, RuleEvaluationInput, RuleFinding, RuleScope } from '@ankhorage/rules';
import { isRecord } from '@ankhorage/utility/object';

/*** Supplies portable layout facts to the Alignment and Layout rule family. */
export interface AlignmentRuleContext {
  readonly facts: readonly FactEnvelope[];
}

interface AlignmentMetric {
  readonly measurement: string;
  readonly observed: number;
  readonly subjectIds: readonly string[];
}

type AlignmentRuleId =
  | 'design.alignment.shared-edges'
  | 'design.alignment.grid-tracks'
  | 'design.alignment.baselines'
  | 'design.alignment.text'
  | 'design.alignment.flex-items'
  | 'design.alignment.component-axes'
  | 'design.layout.container-width'
  | 'design.layout.grid-gap'
  | 'design.layout.horizontal-overflow'
  | 'design.layout.vertical-clipping'
  | 'design.layout.unintended-overlap'
  | 'design.layout.unnecessary-wrapper'
  | 'design.layout.visual-balance';

interface AlignmentRuleDefinition {
  readonly assessment: 'heuristic' | 'objective';
  readonly capability: string;
  readonly criterion: string;
  readonly id: AlignmentRuleId;
  readonly measurement: string;
  readonly summary: string;
  readonly tolerance: number;
}

/*** Configures trusted, group-local acceptance tolerances by frozen Alignment and Layout rule ID. */
export interface AlignmentRuleOptions {
  readonly tolerances?: Partial<Record<AlignmentRuleId, number>>;
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
    criterion: 'horizontal overflow',
  },
  {
    ...metricRule(
      'design.layout.vertical-clipping',
      'vertical-clipping',
      'Unexpected vertical clipping is absent.',
    ),
    criterion: 'vertical clipping',
  },
  {
    ...metricRule(
      'design.layout.unintended-overlap',
      'overlap-area',
      'Unexpected overlap is absent.',
    ),
    criterion: 'unintended overlap area',
  },
  {
    ...metricRule(
      'design.layout.unnecessary-wrapper',
      'avoidable-wrapper-count',
      'Avoidable structural wrappers are identified.',
    ),
    assessment: 'heuristic',
    criterion: 'avoidable wrapper count',
  },
  {
    ...metricRule(
      'design.layout.visual-balance',
      'visual-weight-imbalance',
      'Visual weight is balanced.',
    ),
    assessment: 'heuristic',
    capability: 'rendered.area-analysis',
    criterion: 'visual weight imbalance',
    tolerance: 0.1,
  },
];

/*** Creates the independently registrable Alignment and Layout rules without mutating a provider registry. */
export function createAlignmentRules(
  options: AlignmentRuleOptions = {},
): readonly Rule<AlignmentRuleContext>[] {
  return definitions.map((definition) =>
    createAlignmentRule({ ...definition, tolerance: resolveTolerance(definition, options) }),
  );
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

  if (metric.observed <= definition.tolerance) return { findings: [], status: 'PASS' as const };

  return { findings: [finding(definition, input, metric)], status: 'FAIL' as const };
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

/*** Validates the group-local observed geometry payload without trusting adapter acceptance criteria. */
function parseMetric(value: unknown, measurement: string): AlignmentMetric | undefined {
  if (!isRecord(value)) return undefined;
  const { measurement: candidateMeasurement, observed, subjectIds } = value;
  if (
    candidateMeasurement !== measurement ||
    typeof observed !== 'number' ||
    !Number.isFinite(observed) ||
    observed < 0 ||
    !Array.isArray(subjectIds) ||
    subjectIds.length === 0 ||
    !subjectIds.every((id) => typeof id === 'string' && id.trim().length > 0) ||
    new Set(subjectIds).size !== subjectIds.length
  ) {
    return undefined;
  }
  return { measurement, observed, subjectIds };
}

/*** Requires duplicate facts to state the same complete normalized observation. */
function sameMetric(metric: AlignmentMetric, otherMetric: AlignmentMetric | undefined): boolean {
  return (
    otherMetric?.measurement === metric.measurement &&
    metric.observed === otherMetric.observed &&
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

/*** Describes an observation that exceeds this rule's trusted acceptance tolerance. */
function finding(
  definition: AlignmentRuleDefinition,
  input: RuleEvaluationInput<AlignmentRuleContext>,
  metric: AlignmentMetric,
): RuleFinding {
  return {
    evidence: {
      observed: metric.observed,
      tolerance: definition.tolerance,
    },
    message: `${definition.summary} Observed ${definition.criterion} ${metric.observed} exceeds tolerance ${definition.tolerance}.`,
    ruleId: definition.id,
    severity: definition.assessment === 'objective' ? 'warning' : 'info',
    subjects: metric.subjectIds.map((id) => ({ id, kind: input.scope.kind })),
  };
}

/*** Resolves a trusted policy override and rejects invalid acceptance thresholds at the factory boundary. */
function resolveTolerance(
  definition: AlignmentRuleDefinition,
  options: AlignmentRuleOptions,
): number {
  const tolerance = options.tolerances?.[definition.id] ?? definition.tolerance;
  if (!Number.isFinite(tolerance) || tolerance < 0) {
    throw new TypeError(`Tolerance for "${definition.id}" must be a finite non-negative number.`);
  }
  return tolerance;
}

/*** Builds one objective layout metric rule definition with a zero-deviation semantic default. */
function metricRule(
  id: AlignmentRuleId,
  measurement: string,
  summary: string,
): AlignmentRuleDefinition {
  return {
    assessment: 'objective',
    capability: 'dom.layout',
    criterion: 'layout deviation',
    id,
    measurement,
    summary,
    tolerance: 0,
  };
}
