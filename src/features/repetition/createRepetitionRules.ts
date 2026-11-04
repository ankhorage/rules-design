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

/*** Defines one serializable inspected value for one Repetition rule and semantic scope. */
export interface RepetitionRuleFact {
  readonly actual: JsonValue;
  readonly expected: JsonValue;
  readonly id: string;
  readonly ruleId: RepetitionRuleId;
  readonly scope: RuleScope;
  readonly subject: RuleSubject;
}

/*** Supplies immutable normalized Repetition facts without coupling Rules to a browser host. */
export interface RepetitionRuleContext {
  readonly repetitionFacts: readonly RepetitionRuleFact[];
}

/*** Constructs one fact-driven Repetition rule with the catalog's component-tree capability. */
function createRepetitionRule(id: RepetitionRuleId, summary: string): RepetitionRule {
  return {
    defaultSeverity: 'warning',
    dependencies: [],
    evaluate: ({ context, scope }) => evaluateRepetitionFacts(id, context.repetitionFacts, scope),
    facets: [{ id: 'principle', value: 'repetition' }],
    identity: { id, version: '1.0.0' },
    requiredCapabilities: ['ui.component-tree'],
    summary,
  };
}

/*** Evaluates inspected facts for one rule without treating absent scope evidence as a pass. */
function evaluateRepetitionFacts(
  ruleId: RepetitionRuleId,
  facts: readonly RepetitionRuleFact[],
  scope: RuleScope,
) {
  const scopedFacts = facts.filter(
    (fact) =>
      fact.ruleId === ruleId && fact.scope.id === scope.id && fact.scope.kind === scope.kind,
  );
  if (scopedFacts.length === 0) {
    return {
      findings: [
        {
          evidence: { factCount: 0, scopeId: scope.id },
          message: `Rule "${ruleId}" requires inspected component facts for scope "${scope.id}".`,
          ruleId,
          severity: 'warning' as const,
          subjects: [{ id: scope.id, kind: scope.kind }],
        },
      ],
      status: 'INCOMPLETE' as const,
    };
  }
  const findings = scopedFacts
    .filter((fact) => !isSameJsonValue(fact.actual, fact.expected))
    .map((fact) => ({
      evidence: { actual: fact.actual, expected: fact.expected, factId: fact.id },
      message: `Observed value for "${fact.id}" does not match the expected repeated value.`,
      ruleId,
      severity: 'warning' as const,
      subjects: [fact.subject],
    }));
  return { findings, status: findings.length === 0 ? ('PASS' as const) : ('FAIL' as const) };
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
