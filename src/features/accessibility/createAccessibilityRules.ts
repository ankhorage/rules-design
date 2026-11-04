import type { FactEnvelope } from '@ankhorage/contracts/rules';
import type { Rule, RuleEvaluationOutcome, RuleSubject } from '@ankhorage/rules';

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
  readonly passed: boolean;
  readonly subject: RuleSubject;
}

interface AccessibilityFactValue {
  readonly observations: readonly AccessibilityObservation[];
}

const accessibilityRuleDefinitions: readonly AccessibilityRuleDefinition[] = [
  {
    id: 'design.a11y.accessible-name',
    requiredCapabilities: ['dom.accessibility-tree'],
    summary: 'Interactive controls have accessible names.',
  },
  {
    id: 'design.a11y.form-label',
    requiredCapabilities: ['dom.accessibility-tree'],
    summary: 'Form fields have correct labels.',
  },
  {
    id: 'design.a11y.error-association',
    requiredCapabilities: ['dom.accessibility-tree'],
    summary: 'Validation errors are semantically associated with their fields.',
  },
  {
    id: 'design.a11y.keyboard-reachability',
    requiredCapabilities: ['browser.keyboard-navigation'],
    summary: 'Interactive elements are keyboard reachable.',
  },
  {
    id: 'design.a11y.focus-order',
    requiredCapabilities: ['dom.accessibility-tree'],
    summary: 'Focus order is meaningful.',
  },
  {
    id: 'design.a11y.color-only',
    requiredCapabilities: ['dom.computed-style', 'dom.accessibility-tree'],
    summary: 'Information is not conveyed by color alone.',
  },
  {
    id: 'design.a11y.reduced-motion',
    requiredCapabilities: ['browser.media-preference', 'browser.motion'],
    summary: 'Reduced-motion settings are respected.',
  },
  {
    id: 'design.a11y.landmarks',
    requiredCapabilities: ['dom.accessibility-tree'],
    summary: 'Landmarks are meaningful.',
  },
  {
    id: 'design.a11y.main-landmark',
    requiredCapabilities: ['dom.accessibility-tree'],
    summary: 'Main content is identified.',
  },
  {
    id: 'design.a11y.list-semantics',
    requiredCapabilities: ['dom.accessibility-tree'],
    summary: 'Lists have correct semantics.',
  },
  {
    id: 'design.a11y.button-link-semantics',
    requiredCapabilities: ['dom.accessibility-tree'],
    summary: 'Buttons and links have correct semantics.',
  },
  {
    id: 'design.a11y.status-feedback',
    requiredCapabilities: ['dom.accessibility-tree'],
    summary: 'Status changes are announced.',
  },
  {
    id: 'design.a11y.text-alternatives',
    requiredCapabilities: ['dom.accessibility-tree'],
    summary: 'Text alternatives are meaningful and decorative media is identified.',
  },
];

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
  const observations = availableFacts.flatMap((fact) => {
    const value = parseAccessibilityFactValue(fact.value);
    return value === null ? [] : value.observations;
  });

  if (matchingFacts.length === 0 || availableFacts.length !== matchingFacts.length) {
    return { findings: [], status: 'INCOMPLETE' };
  }
  if (
    observations.length !==
    availableFacts.reduce((total, fact) => total + observationCount(fact), 0)
  ) {
    return { findings: [], status: 'INCOMPLETE' };
  }

  const failedObservations = observations.filter((observation) => !observation.passed);
  return failedObservations.length === 0
    ? { findings: [], status: 'PASS' }
    : {
        findings: failedObservations.map((observation) => ({
          evidence: { detail: observation.detail, observationId: observation.id },
          message: `${definition.summary} ${observation.detail}`,
          ruleId: definition.id,
          severity: 'error',
          subjects: [observation.subject],
        })),
        status: 'FAIL',
      };
}

/*** Counts valid observations so malformed serializable values cannot produce a passing outcome. */
function observationCount(fact: Extract<FactEnvelope, { readonly status: 'available' }>): number {
  return parseAccessibilityFactValue(fact.value)?.observations.length ?? -1;
}

/*** Narrows a portable serializable fact value to the local accessibility observation schema. */
function parseAccessibilityFactValue(value: unknown): AccessibilityFactValue | null {
  if (!isRecord(value) || !Array.isArray(value.observations)) return null;
  const observations = value.observations.flatMap(parseAccessibilityObservation);
  return observations.length === value.observations.length ? { observations } : null;
}

/*** Narrows one serializable observation without accepting incomplete subject evidence. */
function parseAccessibilityObservation(value: unknown): readonly AccessibilityObservation[] {
  if (
    !isRecord(value) ||
    typeof value.detail !== 'string' ||
    typeof value.id !== 'string' ||
    typeof value.passed !== 'boolean' ||
    !isRuleSubject(value.subject)
  ) {
    return [];
  }
  return [
    {
      detail: value.detail,
      id: value.id,
      passed: value.passed,
      subject: value.subject,
    },
  ];
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
