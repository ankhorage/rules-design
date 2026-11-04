import type { FactEnvelope } from '@ankhorage/contracts/rules';
import type { Rule, RuleEvaluationOutcome, RuleFinding } from '@ankhorage/rules';

interface ContrastContext {
  readonly facts: readonly FactEnvelope[];
}

interface ContrastMeasurement {
  readonly actual: number;
  readonly comparison: 'at-least' | 'at-most' | 'equal';
  readonly expected: number;
  readonly ruleId: ContrastRuleId;
  readonly subject: {
    readonly id: string;
    readonly kind: string;
    readonly path?: string;
  };
}

interface ContrastRuleDefinition {
  readonly id: ContrastRuleId;
  readonly requiredCapabilities: readonly string[];
  readonly severity: 'error' | 'warning';
  readonly summary: string;
}

type ContrastRuleId =
  | 'design.contrast.text-ratio'
  | 'design.contrast.nontext-ratio'
  | 'design.contrast.focus-visible'
  | 'design.contrast.surface-separation'
  | 'design.contrast.state-distinction'
  | 'design.contrast.link-distinction'
  | 'design.contrast.text-background-resolved'
  | 'design.contrast.cta-prominence'
  | 'design.contrast.visual-hierarchy';

const contrastRuleDefinitions: readonly ContrastRuleDefinition[] = [
  {
    id: 'design.contrast.text-ratio',
    requiredCapabilities: ['dom.computed-style', 'dom.text-content'],
    severity: 'error',
    summary: 'Require measured effective text contrast to meet its supplied standard.',
  },
  {
    id: 'design.contrast.nontext-ratio',
    requiredCapabilities: ['dom.computed-style', 'dom.text-content'],
    severity: 'error',
    summary: 'Require measured non-text contrast to meet its supplied standard.',
  },
  {
    id: 'design.contrast.focus-visible',
    requiredCapabilities: ['dom.computed-style', 'browser.interaction-state'],
    severity: 'error',
    summary: 'Require a measured focus indicator to meet its supplied visibility threshold.',
  },
  {
    id: 'design.contrast.surface-separation',
    requiredCapabilities: ['dom.computed-style', 'dom.text-content'],
    severity: 'error',
    summary: 'Require adjacent surfaces to meet their supplied separation threshold.',
  },
  {
    id: 'design.contrast.state-distinction',
    requiredCapabilities: ['dom.computed-style'],
    severity: 'error',
    summary: 'Require measured interactive states to meet their supplied distinction threshold.',
  },
  {
    id: 'design.contrast.link-distinction',
    requiredCapabilities: ['dom.computed-style'],
    severity: 'error',
    summary: 'Require measured links to meet their supplied distinction threshold.',
  },
  {
    id: 'design.contrast.text-background-resolved',
    requiredCapabilities: ['dom.computed-style'],
    severity: 'error',
    summary: 'Require resolved effective text-background measurements.',
  },
  {
    id: 'design.contrast.cta-prominence',
    requiredCapabilities: ['dom.computed-style'],
    severity: 'warning',
    summary: 'Advisory check that primary calls to action meet a supplied prominence threshold.',
  },
  {
    id: 'design.contrast.visual-hierarchy',
    requiredCapabilities: ['dom.computed-style'],
    severity: 'warning',
    summary: 'Advisory check that measured visual emphasis meets a supplied hierarchy threshold.',
  },
];

/*** Creates the independent Contrast and Visual Hierarchy rule contribution from portable facts. */
export function createContrastRules(): readonly Rule<ContrastContext>[] {
  return contrastRuleDefinitions.map(createContrastRule);
}

/*** Creates one deterministic rule from its frozen catalog identity and capability requirements. */
function createContrastRule(definition: ContrastRuleDefinition): Rule<ContrastContext> {
  return {
    defaultSeverity: definition.severity,
    dependencies: [],
    evaluate: ({ context, scope }) => evaluateContrastRule(definition, context.facts, scope.id),
    identity: { id: definition.id, version: '1.0.0' },
    requiredCapabilities: definition.requiredCapabilities,
    summary: definition.summary,
  };
}

/*** Evaluates measurements for one exact scope without treating absent or malformed facts as passing. */
function evaluateContrastRule(
  definition: ContrastRuleDefinition,
  facts: readonly FactEnvelope[],
  scopeId: string,
): RuleEvaluationOutcome {
  const measurements = facts.flatMap((fact) => toContrastMeasurement(fact, definition.id, scopeId));
  if (measurements.length === 0) return incomplete(definition.id, scopeId);

  const failures = measurements.filter((measurement) => !matchesExpectation(measurement));
  return failures.length === 0
    ? { findings: [], status: 'PASS' }
    : {
        findings: failures.map((measurement) => failure(definition.id, measurement)),
        status: 'FAIL',
      };
}

/*** Selects one available, scope-matched portable measurement with an exact rule identity. */
function toContrastMeasurement(
  fact: FactEnvelope,
  ruleId: ContrastRuleId,
  scopeId: string,
): readonly ContrastMeasurement[] {
  if (fact.status !== 'available' || fact.kind !== 'design.contrast.measurement') return [];
  if (fact.scope.id !== scopeId || !isContrastMeasurement(fact.value, ruleId)) return [];
  return [fact.value];
}

/*** Validates the JSON fact payload before the rule compares its explicit observed and expected values. */
function isContrastMeasurement(
  value: unknown,
  ruleId: ContrastRuleId,
): value is ContrastMeasurement {
  if (!isRecord(value) || value.ruleId !== ruleId || !isRecord(value.subject)) return false;
  return (
    isFiniteNumber(value.actual) &&
    isFiniteNumber(value.expected) &&
    (value.comparison === 'at-least' ||
      value.comparison === 'at-most' ||
      value.comparison === 'equal') &&
    typeof value.subject.id === 'string' &&
    typeof value.subject.kind === 'string' &&
    (value.subject.path === undefined || typeof value.subject.path === 'string')
  );
}

/*** Compares a supplied observation to its versioned adapter-provided expectation without hidden thresholds. */
function matchesExpectation(measurement: ContrastMeasurement): boolean {
  if (measurement.comparison === 'at-least') return measurement.actual >= measurement.expected;
  if (measurement.comparison === 'at-most') return measurement.actual <= measurement.expected;
  return measurement.actual === measurement.expected;
}

/*** Explains that no usable measurement was available for the selected rule and scope. */
function incomplete(ruleId: ContrastRuleId, scopeId: string): RuleEvaluationOutcome {
  return {
    findings: [
      {
        evidence: { scopeId },
        message: `Rule "${ruleId}" requires an available design.contrast.measurement fact for scope "${scopeId}".`,
        ruleId,
        severity: 'info',
        subjects: [{ id: scopeId, kind: 'rule-scope' }],
      },
    ],
    status: 'INCOMPLETE',
  };
}

/*** Creates one serializable finding that retains the observed measurement and exact affected subject. */
function failure(ruleId: ContrastRuleId, measurement: ContrastMeasurement): RuleFinding {
  return {
    evidence: {
      actual: measurement.actual,
      comparison: measurement.comparison,
      expected: measurement.expected,
    },
    message: `Measured value ${measurement.actual} does not satisfy ${measurement.comparison} ${measurement.expected}.`,
    ruleId,
    severity: 'info',
    subjects: [measurement.subject],
  };
}

/*** Narrows an unknown JSON value to a plain record without relying on prototype behavior. */
function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/*** Identifies finite numeric measurements so non-numeric serialized values remain incomplete. */
function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
