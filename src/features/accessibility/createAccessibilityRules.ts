import type { FactEnvelope } from '@ankhorage/contracts/rules';
import type { Rule, RuleEvaluationOutcome, RuleSubject } from '@ankhorage/rules';

import { evaluateAccessibilityObservation } from './evaluateAccessibilityObservation.js';

/*** Creates the independently owned Accessibility and Semantics rule family. */
export function createAccessibilityRules(): readonly Rule<DesignAccessibilityContext>[] {
  return accessibilityRuleDefinitions.map(createAccessibilityRule);
}

interface DesignAccessibilityContext {
  readonly facts: readonly FactEnvelope[];
}

interface AccessibilityRuleDefinition {
  readonly id: string;
  readonly requiredCapabilities: readonly string[];
  readonly summary: string;
}

interface AccessibilityObservation {
  readonly detail: string;
  readonly id: string;
  readonly kind: string;
  readonly properties: Readonly<Record<string, unknown>>;
  readonly subject: RuleSubject;
}

interface AccessibilityFactValue {
  readonly observations: readonly AccessibilityObservation[];
}

const accessibilityRuleDefinitions: readonly AccessibilityRuleDefinition[] = [
  definition(
    'design.a11y.accessible-name',
    ['dom.accessibility-tree'],
    'Interactive controls have accessible names.',
  ),
  definition(
    'design.a11y.form-label',
    ['dom.accessibility-tree'],
    'Form fields have correct labels.',
  ),
  definition(
    'design.a11y.error-association',
    ['dom.accessibility-tree'],
    'Validation errors are semantically associated with their fields.',
  ),
  definition(
    'design.a11y.keyboard-reachability',
    ['browser.keyboard-navigation'],
    'Interactive elements are keyboard reachable.',
  ),
  definition('design.a11y.focus-order', ['dom.accessibility-tree'], 'Focus order is meaningful.'),
  definition(
    'design.a11y.color-only',
    ['dom.computed-style', 'dom.accessibility-tree'],
    'Information is not conveyed by color alone.',
  ),
  definition(
    'design.a11y.reduced-motion',
    ['browser.media-preference', 'browser.motion'],
    'Reduced-motion settings are respected.',
  ),
  definition('design.a11y.landmarks', ['dom.accessibility-tree'], 'Landmarks are meaningful.'),
  definition(
    'design.a11y.main-landmark',
    ['dom.accessibility-tree'],
    'Main content is identified.',
  ),
  definition(
    'design.a11y.list-semantics',
    ['dom.accessibility-tree'],
    'Lists have correct semantics.',
  ),
  definition(
    'design.a11y.button-link-semantics',
    ['dom.accessibility-tree'],
    'Buttons and links have correct semantics.',
  ),
  definition(
    'design.a11y.status-feedback',
    ['dom.accessibility-tree'],
    'Status changes are announced.',
  ),
  definition(
    'design.a11y.text-alternatives',
    ['dom.accessibility-tree'],
    'Text alternatives are meaningful and decorative media is identified.',
  ),
];

/*** Defines one frozen rule identity with the observations that can support its verdict. */
function definition(
  id: string,
  requiredCapabilities: readonly string[],
  summary: string,
): AccessibilityRuleDefinition {
  return { id, requiredCapabilities, summary };
}

/*** Adapts one declared accessibility invariant to the generic Rules contract. */
function createAccessibilityRule(
  definition: AccessibilityRuleDefinition,
): Rule<DesignAccessibilityContext> {
  return {
    defaultSeverity: 'error',
    dependencies: [],
    evaluate: ({ context, scope }) =>
      evaluateAccessibilityFact(context.facts, definition, scope.id, scope.kind),
    identity: { id: definition.id, version: '1.0.0' },
    requiredCapabilities: definition.requiredCapabilities,
    summary: definition.summary,
  };
}

/*** Resolves one scoped fact into an explicit PASS, FAIL, or INCOMPLETE rule outcome. */
function evaluateAccessibilityFact(
  facts: readonly FactEnvelope[],
  definition: AccessibilityRuleDefinition,
  scopeId: string,
  scopeKind: string,
): RuleEvaluationOutcome {
  const matchingFacts = facts.filter(
    (fact) =>
      fact.kind === definition.id && fact.scope.id === scopeId && fact.scope.kind === scopeKind,
  );
  const availableFacts = matchingFacts.filter(
    (fact): fact is Extract<FactEnvelope, { readonly status: 'available' }> =>
      fact.status === 'available',
  );
  const values = availableFacts.map((fact) => parseAccessibilityFactValue(fact.value));
  if (
    matchingFacts.length === 0 ||
    availableFacts.length !== matchingFacts.length ||
    values.some((value) => value === null)
  )
    return incomplete();
  const observations = values.flatMap((value) => value?.observations ?? []);
  if (observations.length === 0) return incomplete();
  const evaluations = observations.map((observation) => ({
    observation,
    verdict: evaluateAccessibilityObservation(definition.id, observation),
  }));
  if (evaluations.some(({ verdict }) => verdict === 'INCOMPLETE')) return incomplete();
  const failures = evaluations
    .filter(({ verdict }) => verdict === 'FAIL')
    .map(({ observation }) => observation);
  return failures.length === 0 ? { findings: [], status: 'PASS' } : fail(definition, failures);
}

/*** Returns the canonical closed outcome when facts cannot defend a verdict. */
function incomplete(): RuleEvaluationOutcome {
  return { findings: [], status: 'INCOMPLETE' };
}

/*** Builds findings only from observations that explicitly contradict a rule invariant. */
function fail(
  definition: AccessibilityRuleDefinition,
  observations: readonly AccessibilityObservation[],
): RuleEvaluationOutcome {
  return {
    findings: observations.map((observation) => ({
      evidence: { detail: observation.detail, observationId: observation.id },
      message: `${definition.summary} ${observation.detail}`,
      ruleId: definition.id,
      severity: 'error',
      subjects: [observation.subject],
    })),
    status: 'FAIL',
  };
}

/*** Narrows a portable serializable fact value to complete normalized observations. */
function parseAccessibilityFactValue(value: unknown): AccessibilityFactValue | null {
  if (!isRecord(value) || !Array.isArray(value.observations)) return null;
  const observations = value.observations.map(parseAccessibilityObservation);
  return observations.every((observation) => observation !== null) ? { observations } : null;
}

/*** Narrows one serializable observation without accepting incomplete subject evidence. */
function parseAccessibilityObservation(value: unknown): AccessibilityObservation | null {
  if (
    !isRecord(value) ||
    typeof value.detail !== 'string' ||
    typeof value.id !== 'string' ||
    typeof value.kind !== 'string' ||
    !isRecord(value.properties) ||
    !isRuleSubject(value.subject)
  )
    return null;
  return {
    detail: value.detail,
    id: value.id,
    kind: value.kind,
    properties: value.properties,
    subject: value.subject,
  };
}

/*** Checks the portable subject shape retained in the generic Rules result contract. */
function isRuleSubject(value: unknown): value is RuleSubject {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.kind === 'string' &&
    (value.path === undefined || typeof value.path === 'string')
  );
}
/*** Narrows unknown serializable values before reading their named factual fields. */
function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
