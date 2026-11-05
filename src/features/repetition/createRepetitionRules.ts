import { isSerializableValue } from '@ankhorage/contracts';
import type { AvailableFactEnvelope, FactEnvelope } from '@ankhorage/contracts/rules';
import type { JsonValue, Rule, RuleScope, RuleSubject } from '@ankhorage/rules';

const repetitionRuleDefinitions = [
  ['design.repetition.button-variants', 'Button variants are consistent.'],
  ['design.repetition.card-variants', 'Card variants and templates are consistent.'],
  ['design.repetition.heading-variants', 'Heading roles are consistent.'],
  ['design.repetition.form-control-style', 'Form controls are consistently styled.'],
  ['design.repetition.link-treatment', 'Link treatment is consistent.'],
  ['design.repetition.navigation-treatment', 'Navigation treatment is consistent.'],
  ['design.repetition.icons', 'Icon size and style are consistent.'],
  ['design.repetition.border-radius', 'Border radii follow tokens and variants.'],
  ['design.repetition.border-weight', 'Border weights are consistent.'],
  ['design.repetition.elevation', 'Shadows and elevation are consistent.'],
  ['design.repetition.motion', 'Motion patterns are consistent.'],
  ['design.repetition.local-overrides', 'Unwanted local overrides are identified.'],
  ['design.repetition.template-drift', 'Instances do not drift from their template.'],
] as const;

type RepetitionRuleId = (typeof repetitionRuleDefinitions)[number][0];
type RepetitionRule = Rule<RepetitionRuleContext> & {
  readonly identity: { readonly id: RepetitionRuleId; readonly version: '1.0.0' };
};

/*** Creates the atomic Repetition and Components Rules from normalized inspected facts. */
export function createRepetitionRules(): readonly RepetitionRule[] {
  return repetitionRuleDefinitions.map(([id, summary]) => createRepetitionRule(id, summary));
}

/*** Supplies immutable FactEnvelope observations without coupling Rules to a browser host. */
export interface RepetitionRuleContext {
  readonly facts: readonly FactEnvelope[];
}

interface RepetitionObservation {
  readonly actual: JsonValue;
  readonly expected: JsonValue;
  readonly ruleId: RepetitionRuleId;
  readonly subject: RuleSubject;
}

/*** Constructs one fact-driven Repetition rule with the catalog's component-tree capability. */
function createRepetitionRule(id: RepetitionRuleId, summary: string): RepetitionRule {
  return {
    defaultSeverity: 'warning',
    dependencies: [],
    evaluate: ({ context, scope }) => evaluateRepetitionFacts(id, context.facts, scope),
    facets: [{ id: 'principle', value: 'repetition' }],
    identity: { id, version: '1.0.0' },
    requiredCapabilities: ['ui.component-tree'],
    summary,
  };
}

/*** Evaluates inspected facts for one rule without treating absent scope evidence as a pass. */
function evaluateRepetitionFacts(
  ruleId: RepetitionRuleId,
  facts: readonly FactEnvelope[],
  scope: RuleScope,
) {
  const scopedFacts = facts.filter((fact) => isRepetitionFactForScope(fact, ruleId, scope));
  const normalizedFacts = scopedFacts
    .filter((fact): fact is AvailableFactEnvelope => fact.status === 'available')
    .map((fact) => ({ fact, observation: normalizeRepetitionObservation(fact) }));
  const observations = normalizedFacts.flatMap(({ fact, observation }) =>
    observation !== null && observation.ruleId === ruleId ? [{ fact, observation }] : [],
  );
  if (scopedFacts.length === 0 || observations.length !== scopedFacts.length) {
    return {
      findings: [
        {
          evidence: { factCount: 0, scopeId: scope.id },
          message: `Rule "${ruleId}" requires an available normalized component observation for scope "${scope.id}".`,
          ruleId,
          severity: 'warning' as const,
          subjects: [{ id: scope.id, kind: scope.kind }],
        },
      ],
      status: 'INCOMPLETE' as const,
    };
  }
  const findings = observations
    .filter(({ observation }) => !isSameJsonValue(observation.actual, observation.expected))
    .map(({ fact, observation }) => ({
      evidence: { actual: observation.actual, expected: observation.expected, factId: fact.id },
      message: `Observed value for "${observation.subject.id}" does not match the expected repeated value.`,
      ruleId,
      severity: 'warning' as const,
      subjects: [observation.subject],
    }));
  return { findings, status: findings.length === 0 ? ('PASS' as const) : ('FAIL' as const) };
}

/*** Accepts only the provider's component-observation envelopes for the exact evaluation scope. */
function isRepetitionFactForScope(
  fact: FactEnvelope,
  ruleId: RepetitionRuleId,
  scope: RuleScope,
): boolean {
  return (
    fact.kind === 'design.repetition.observation' &&
    fact.id.startsWith(`${ruleId}:`) &&
    fact.scope.id === scope.id &&
    fact.scope.kind === scope.kind
  );
}

/*** Validates the normalized portable observation payload before repetition policy consumes it. */
function normalizeRepetitionObservation(fact: FactEnvelope): RepetitionObservation | null {
  if (!isValidFactEnvelope(fact) || fact.status !== 'available' || !isRecord(fact.value)) {
    return null;
  }
  const { actual, expected, ruleId, subject } = fact.value;
  return isRepetitionRuleId(ruleId) &&
    isRuleSubject(subject) &&
    isSerializableValue(actual) &&
    isSerializableValue(expected)
    ? { actual, expected, ruleId, subject }
    : null;
}

/*** Verifies that required FactEnvelope identity, scope, provenance, availability, and hash fields are usable. */
function isValidFactEnvelope(fact: FactEnvelope): boolean {
  return (
    hasValidFactIdentity(fact) &&
    hasValidFactScope(fact) &&
    hasValidFactProvenance(fact) &&
    hasValidFactAvailability(fact)
  );
}

/*** Verifies stable identity fields and content integrity metadata on one portable fact. */
function hasValidFactIdentity(fact: FactEnvelope): boolean {
  return hasText(fact.id) && hasText(fact.kind) && hasText(fact.contentHash);
}

/*** Verifies the complete target partition attached to one portable fact scope. */
function hasValidFactScope(fact: FactEnvelope): boolean {
  return (
    hasText(fact.scope.id) &&
    hasText(fact.scope.kind) &&
    hasText(fact.scope.target.tenantId) &&
    hasText(fact.scope.target.projectId) &&
    hasText(fact.scope.target.targetId) &&
    hasText(fact.scope.target.kind)
  );
}

/*** Verifies that a portable fact retains a traceable producer and inspected source. */
function hasValidFactProvenance(fact: FactEnvelope): boolean {
  return (
    hasText(fact.provenance.collectedAt) &&
    hasText(fact.provenance.producer.id) &&
    hasText(fact.provenance.producer.version) &&
    hasText(fact.provenance.source.id) &&
    (fact.provenance.source.revision === null || hasText(fact.provenance.source.revision))
  );
}

/*** Verifies that available values and unavailable reasons remain explicitly represented. */
function hasValidFactAvailability(fact: FactEnvelope): boolean {
  return fact.status === 'available'
    ? isSerializableValue(fact.value)
    : hasText(fact.missing.code) && hasText(fact.missing.message);
}

/*** Narrows a non-empty serializable text field without accepting whitespace-only identities. */
function hasText(value: string): boolean {
  return value.trim().length > 0;
}

/*** Narrows one observation rule identifier to the frozen Repetition catalog. */
function isRepetitionRuleId(value: unknown): value is RepetitionRuleId {
  return typeof value === 'string' && repetitionRuleDefinitions.some(([id]) => id === value);
}

/*** Narrows an observation subject without admitting anonymous or host-specific values. */
function isRuleSubject(value: unknown): value is RuleSubject {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.kind === 'string' &&
    hasText(value.id) &&
    hasText(value.kind)
  );
}

/*** Narrows an unknown JSON value to a non-array record before reading named fields. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/*** Compares normalized JSON facts structurally so host-specific object identity cannot affect results. */
function isSameJsonValue(left: JsonValue, right: JsonValue): boolean {
  if (left === right) return true;
  if (left === null || right === null || typeof left !== 'object' || typeof right !== 'object') {
    return false;
  }
  if (isJsonArray(left)) {
    return isJsonArray(right) && isSameJsonArray(left, right);
  }
  if (isJsonArray(right)) return false;
  const leftEntries: readonly (readonly [string, JsonValue])[] = Object.entries(left).sort(
    ([leftKey], [rightKey]) => leftKey.localeCompare(rightKey),
  );
  const rightEntries: readonly (readonly [string, JsonValue])[] = Object.entries(right).sort(
    ([leftKey], [rightKey]) => leftKey.localeCompare(rightKey),
  );
  return (
    leftEntries.length === rightEntries.length &&
    leftEntries.every(([leftKey, leftValue], index) => {
      const rightEntry = rightEntries.at(index);
      if (rightEntry === undefined) return false;
      return leftKey === rightEntry[0] && isSameJsonValue(leftValue, rightEntry[1]);
    })
  );
}

/*** Narrows one serializable JSON value to an ordered JSON array. */
function isJsonArray(value: JsonValue): value is readonly JsonValue[] {
  return Array.isArray(value);
}

/*** Compares JSON arrays in order without relying on host object identity. */
function isSameJsonArray(left: readonly JsonValue[], right: readonly JsonValue[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => {
      const rightValue = right.at(index);
      return rightValue !== undefined && isSameJsonValue(value, rightValue);
    })
  );
}
