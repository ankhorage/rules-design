import type { FactEnvelope } from '@ankhorage/contracts/rules';
import type { Rule, RuleEvaluationInput, RuleFinding } from '@ankhorage/rules';
import { isRecord } from '@ankhorage/utility/object';

/*** Supplies portable layout facts to the Alignment and Layout rule family. */
export interface AlignmentRuleContext {
  readonly facts: readonly FactEnvelope[];
}

interface AlignmentMetric {
  readonly expected: number;
  readonly observed: number;
  readonly subjectIds: readonly string[];
  readonly tolerance: number;
}

interface AlignmentRuleDefinition {
  readonly assessment: 'heuristic' | 'objective';
  readonly capability: string;
  readonly id: string;
  readonly summary: string;
}

const definitions: readonly AlignmentRuleDefinition[] = [
  metricRule('design.alignment.shared-edges', 'Shared visual edges align.'),
  metricRule('design.alignment.grid-tracks', 'Elements follow grid tracks.'),
  metricRule('design.alignment.baselines', 'Typical baselines align.'),
  metricRule('design.alignment.text', 'Text alignment is intentional and consistent.'),
  metricRule('design.alignment.flex-items', 'Flex alignment follows its defined pattern.'),
  metricRule('design.alignment.component-axes', 'Equivalent components share axes.'),
  metricRule('design.layout.container-width', 'Container widths obey configured bounds.'),
  metricRule('design.layout.grid-gap', 'Grid gaps follow the system.'),
  {
    ...metricRule('design.layout.horizontal-overflow', 'Unexpected horizontal overflow is absent.'),
    capability: 'viewport.layout',
  },
  metricRule('design.layout.vertical-clipping', 'Unexpected vertical clipping is absent.'),
  metricRule('design.layout.unintended-overlap', 'Unexpected overlap is absent.'),
  {
    ...metricRule(
      'design.layout.unnecessary-wrapper',
      'Avoidable structural wrappers are identified.',
    ),
    assessment: 'heuristic',
  },
  {
    ...metricRule('design.layout.visual-balance', 'Visual weight is balanced.'),
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
  const metric = findAlignmentMetric(input.context.facts, definition.id, input.scope.id);
  if (!metric) return incompleteOutcome(definition, input);

  const deviation = Math.abs(metric.observed - metric.expected);
  if (deviation <= metric.tolerance) return { findings: [], status: 'PASS' as const };

  return { findings: [finding(definition, input, metric, deviation)], status: 'FAIL' as const };
}

/*** Finds one available metric fact whose scope is exactly the active Rules scope. */
function findAlignmentMetric(
  facts: readonly FactEnvelope[],
  ruleId: string,
  scopeId: string,
): AlignmentMetric | undefined {
  const fact = facts.find(
    (fact): fact is FactEnvelope & { readonly status: 'available' } =>
      fact.kind === ruleId && fact.scope.id === scopeId && fact.status === 'available',
  );
  return fact ? parseMetric(fact.value) : undefined;
}

/*** Validates the group-local serializable metric payload without trusting a host adapter. */
function parseMetric(value: unknown): AlignmentMetric | undefined {
  if (!isRecord(value)) return undefined;
  const { expected, observed, subjectIds, tolerance } = value;
  if (
    typeof expected !== 'number' ||
    typeof observed !== 'number' ||
    typeof tolerance !== 'number' ||
    !Array.isArray(subjectIds) ||
    !subjectIds.every((id) => typeof id === 'string')
  ) {
    return undefined;
  }
  return { expected, observed, subjectIds, tolerance };
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
function metricRule(id: string, summary: string): AlignmentRuleDefinition {
  return { assessment: 'objective', capability: 'dom.layout', id, summary };
}
