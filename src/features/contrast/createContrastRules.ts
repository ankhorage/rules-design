import type { FactEnvelope } from '@ankhorage/contracts/rules';
import type {
  JsonValue,
  Rule,
  RuleEvaluationOutcome,
  RuleFinding,
  RuleScope,
  RuleSubject,
} from '@ankhorage/rules';
import { isRecord } from '@ankhorage/utility/object';

import { hasValidContrastMeasurement } from './hasValidContrastMeasurement';

type RuleId =
  | 'design.contrast.text-ratio'
  | 'design.contrast.nontext-ratio'
  | 'design.contrast.focus-visible'
  | 'design.contrast.surface-separation'
  | 'design.contrast.state-distinction'
  | 'design.contrast.link-distinction'
  | 'design.contrast.text-background-resolved'
  | 'design.contrast.cta-prominence'
  | 'design.contrast.visual-hierarchy';
interface Context {
  readonly facts: readonly FactEnvelope[];
}
interface ContrastObservation {
  readonly subject: RuleSubject;
  readonly value: Readonly<Record<string, JsonValue>>;
}
interface Definition {
  readonly id: RuleId;
  readonly requiredCapabilities: readonly string[];
  readonly severity: 'error' | 'warning';
  readonly summary: string;
}
const definitions: readonly Definition[] = [
  {
    id: 'design.contrast.text-ratio',
    requiredCapabilities: ['dom.computed-style', 'dom.text-content'],
    severity: 'error',
    summary: 'Require observed effective text contrast to meet the selected WCAG standard.',
  },
  {
    id: 'design.contrast.nontext-ratio',
    requiredCapabilities: ['dom.computed-style'],
    severity: 'error',
    summary: 'Require observed non-text contrast to meet WCAG AA.',
  },
  {
    id: 'design.contrast.focus-visible',
    requiredCapabilities: ['dom.computed-style', 'browser.interaction-state'],
    severity: 'error',
    summary: 'Require a visible focus indicator with sufficient contrast.',
  },
  {
    id: 'design.contrast.surface-separation',
    requiredCapabilities: ['dom.computed-style'],
    severity: 'error',
    summary: 'Require adjacent effective surfaces to remain distinguishable.',
  },
  {
    id: 'design.contrast.state-distinction',
    requiredCapabilities: ['dom.computed-style', 'browser.interaction-state'],
    severity: 'error',
    summary: 'Require observed interactive states to remain distinct.',
  },
  {
    id: 'design.contrast.link-distinction',
    requiredCapabilities: ['dom.computed-style'],
    severity: 'error',
    summary: 'Require links to have a non-color cue or sufficient distinction.',
  },
  {
    id: 'design.contrast.text-background-resolved',
    requiredCapabilities: ['dom.computed-style'],
    severity: 'error',
    summary: 'Require an observed effective text background.',
  },
  {
    id: 'design.contrast.cta-prominence',
    requiredCapabilities: ['dom.computed-style'],
    severity: 'warning',
    summary: 'Require a primary CTA to exceed competing visual prominence.',
  },
  {
    id: 'design.contrast.visual-hierarchy',
    requiredCapabilities: ['dom.computed-style'],
    severity: 'warning',
    summary: 'Require observed visual emphasis to descend through a hierarchy.',
  },
];

/*** Creates the independent Contrast and Visual Hierarchy rule contribution without central registration. */
export function createContrastRules(): readonly Rule<Context>[] {
  return definitions.map(createRule);
}

/*** Creates one frozen rule whose policy is controlled by validated options or canonical standards. */
function createRule(definition: Definition): Rule<Context> {
  return {
    defaultSeverity: definition.severity,
    dependencies: [],
    identity: { id: definition.id, version: '1.0.0' },
    requiredCapabilities: definition.requiredCapabilities,
    summary: definition.summary,
    validateOptions: (options) => validateOptions(definition.id, options),
    evaluate: ({ context, options, scope }) => evaluate(definition, context.facts, options, scope),
  };
}

/*** Evaluates exact-scope observations, rejecting absent, malformed, and self-judging evidence. */
function evaluate(
  definition: Definition,
  facts: readonly FactEnvelope[],
  options: JsonValue | undefined,
  scope: RuleScope,
): RuleEvaluationOutcome {
  const standard = standardFor(definition.id, options);
  const scoped = facts.filter((fact) => matchesRuleScope(fact, definition.id, scope));
  if (scoped.length === 0) return incomplete(definition.id, scope);
  const observations = scoped.flatMap((fact) => toContrastObservation(fact, definition.id));
  if (observations.length !== scoped.length) return incomplete(definition.id, scope);
  const failures = observations.filter(
    (observation) => !passes(definition.id, observation.value, standard),
  );
  return failures.length === 0
    ? { findings: [], status: 'PASS' }
    : {
        findings: failures.map((observation) => failure(definition, standard, observation)),
        status: 'FAIL',
      };
}

/*** Selects only facts whose producer-declared kind identifies this exact frozen rule and scope. */
function matchesRuleScope(fact: FactEnvelope, id: RuleId, scope: RuleScope): boolean {
  if (fact.kind !== id || fact.scope.id !== scope.id || fact.scope.kind !== scope.kind)
    return false;
  return fact.status === 'missing' || (isRecord(fact.value) && fact.value.ruleId === id);
}

/*** Validates a closed versioned standard choice rather than arbitrary numeric acceptance criteria. */
function validateOptions(id: RuleId, options: JsonValue | undefined) {
  return options === undefined ||
    (isRecord(options) &&
      options.version === 1 &&
      typeof options.standard === 'string' &&
      supportsStandard(id, options.standard) &&
      Object.keys(options).every((key) => key === 'version' || key === 'standard'))
    ? []
    : [
        {
          code: 'invalid-contrast-options',
          message: 'Options must contain version 1 and a standard.',
        },
      ];
}

/*** Confines each frozen rule to the standards its policy can evaluate. */
function supportsStandard(id: RuleId, standard: string): boolean {
  if (id === 'design.contrast.text-ratio')
    return ['wcag-aa-large', 'wcag-aa-normal', 'wcag-aaa-large', 'wcag-aaa-normal'].includes(
      standard,
    );
  if (id === 'design.contrast.cta-prominence' || id === 'design.contrast.visual-hierarchy')
    return ['heuristic-clear', 'heuristic-strong'].includes(standard);
  if (id === 'design.contrast.text-background-resolved') return standard === 'heuristic-clear';
  return standard === 'wcag-aa-nontext';
}

/*** Resolves a canonical or validated standard owned by the rule rather than its fact envelope. */
function standardFor(id: RuleId, options: JsonValue | undefined): string {
  const selected =
    isRecord(options) && typeof options.standard === 'string' ? options.standard : undefined;
  if (id === 'design.contrast.text-ratio') {
    return ['wcag-aa-large', 'wcag-aa-normal', 'wcag-aaa-large', 'wcag-aaa-normal'].includes(
      selected ?? '',
    )
      ? (selected ?? 'wcag-aa-normal')
      : 'wcag-aa-normal';
  }
  return id === 'design.contrast.cta-prominence' || id === 'design.contrast.visual-hierarchy'
    ? selected === 'heuristic-strong'
      ? selected
      : 'heuristic-clear'
    : id === 'design.contrast.text-background-resolved'
      ? 'heuristic-clear'
      : 'wcag-aa-nontext';
}

/*** Converts one available contrast fact into a fully validated rule observation. */
function toContrastObservation(fact: FactEnvelope, id: RuleId): readonly ContrastObservation[] {
  if (fact.status !== 'available' || !valid(fact.value, id)) return [];
  return [{ subject: fact.value.subject, value: fact.value }];
}

/*** Validates rule-specific observations and forbids evidence-provided comparisons or thresholds. */
function valid(
  value: JsonValue,
  id: RuleId,
): value is Readonly<Record<string, JsonValue>> & { readonly subject: RuleSubject } {
  return isBaseObservation(value, id) && hasValidContrastMeasurement(id, value);
}

/*** Verifies the evidence fields shared by every Contrast observation. */
function isBaseObservation(
  value: JsonValue,
  id: RuleId,
): value is Readonly<Record<string, JsonValue>> & { readonly subject: RuleSubject } {
  return (
    isRecord(value) &&
    value.ruleId === id &&
    isRuleSubject(value.subject) &&
    !['comparison', 'expected', 'minimum', 'operator', 'threshold'].some((key) => key in value)
  );
}

/*** Applies the rule-owned semantic standard to one complete observation. */
function passes(id: RuleId, value: Record<string, JsonValue>, standard: string): boolean {
  if (id === 'design.contrast.text-background-resolved') return true;
  if (id === 'design.contrast.cta-prominence')
    return (
      Number(value.primaryProminence) - Number(value.competingProminence) >=
      (standard === 'heuristic-strong' ? 0.2 : 0.1)
    );
  if (id === 'design.contrast.visual-hierarchy') {
    const { emphasis } = value;
    if (!isJsonValueArray(emphasis) || emphasis.length < 2) return false;
    return emphasis.slice(1).every((entry, index) => {
      const previous = emphasis.at(index);
      return (
        isScore(entry) &&
        isScore(previous) &&
        previous.score - entry.score >= (standard === 'heuristic-strong' ? 0.2 : 0.1)
      );
    });
  }
  if (id === 'design.contrast.link-distinction')
    return value.nonColorCueVisible === true || Number(value.distinguishingContrastRatio) >= 3;
  if (id === 'design.contrast.focus-visible')
    return value.focusIndicatorVisible === true && Number(value.contrastRatio) >= 3;
  return (
    Number(value.contrastRatio) >=
    (standard === 'wcag-aaa-normal'
      ? 7
      : standard === 'wcag-aa-large' || standard === 'wcag-aa-nontext'
        ? 3
        : 4.5)
  );
}

/*** Produces an incomplete result when evidence cannot prove this exact-scope rule. */
function incomplete(id: RuleId, scope: RuleScope): RuleEvaluationOutcome {
  return {
    findings: [
      {
        evidence: { scopeId: scope.id, scopeKind: scope.kind },
        message: `Rule "${id}" is incomplete for scope "${scope.kind}:${scope.id}".`,
        ruleId: id,
        severity: 'info',
        subjects: [{ id: scope.id, kind: scope.kind }],
      },
    ],
    status: 'INCOMPLETE',
  };
}

/*** Retains observed evidence and the applied canonical standard for a failed rule. */
function failure(
  definition: Definition,
  standard: string,
  observation: ContrastObservation,
): RuleFinding {
  return {
    evidence: { observation: observation.value, standard },
    message: `Observed ${definition.id} evidence does not meet the ${standard} standard.`,
    ruleId: definition.id,
    severity: definition.severity,
    subjects: [observation.subject],
  };
}

/*** Narrows a serializable subject to the Rules finding contract. */
function isRuleSubject(value: unknown): value is RuleSubject {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.kind === 'string' &&
    value.kind.length > 0 &&
    (value.path === undefined || (typeof value.path === 'string' && value.path.length > 0))
  );
}

/*** Narrows a JSON value to an immutable sequence of JSON values. */
function isJsonValueArray(value: JsonValue | undefined): value is readonly JsonValue[] {
  return Array.isArray(value);
}

/*** Narrows a hierarchy entry to a finite observed emphasis score. */
function isScore(value: JsonValue | undefined): value is { readonly score: number } {
  return isRecord(value) && typeof value.score === 'number' && Number.isFinite(value.score);
}
