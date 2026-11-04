import type { Rule, RuleFinding, RuleSet } from '@ankhorage/rules';

import type { DesignContext } from '../../types/designRuleProvider';
import type { TypographyObservation } from '../../types/typography';
import { parseTypographyObservation } from './parseTypographyObservation';

/*** Creates the independent Typography and Heading RuleSet from explicit serialized-fact policy. */
export function createTypographyRuleSet(policy: TypographyRulePolicy): RuleSet<DesignContext> {
  return {
    id: 'ankhorage.rules-design.typography',
    rules: ruleDefinitions.map((definition) => createRule(definition, policy)),
  };
}

type TypographyRuleId =
  | 'design.typography.font-family'
  | 'design.typography.scale'
  | 'design.typography.weight'
  | 'design.typography.line-height'
  | 'design.typography.letter-spacing'
  | 'design.typography.paragraph-measure'
  | 'design.typography.body-minimum'
  | 'design.typography.responsive-scale'
  | 'design.heading.h1-presence'
  | 'design.heading.h1-count'
  | 'design.heading.level-order'
  | 'design.heading.semantic-style'
  | 'design.heading.spacing-before'
  | 'design.heading.spacing-after'
  | 'design.heading.text-clipping';

interface TypographyRulePolicy {
  readonly allowedFontFamilies: readonly string[];
  readonly allowedFontSizes: readonly number[];
  readonly allowedFontWeights: readonly string[];
  readonly allowedLetterSpacings: readonly number[];
  readonly allowedLineHeights: readonly number[];
  readonly allowedSemanticStyles: Readonly<Record<string, readonly string[]>>;
  readonly allowedSpacingAfter: readonly number[];
  readonly allowedSpacingBefore: readonly number[];
  readonly maximumH1Count: number;
  readonly maximumParagraphMeasure: number;
  readonly minimumBodyFontSize: number;
  readonly minimumH1Count: number;
  readonly minimumParagraphMeasure: number;
  readonly responsiveFontSizes: Readonly<Record<string, readonly number[]>>;
}

interface RuleDefinition {
  readonly capability: 'design.heading-facts' | 'design.typography-facts';
  readonly evaluate: (
    observations: readonly TypographyObservation[],
    policy: TypographyRulePolicy,
  ) => readonly TypographyObservation[];
  readonly id: TypographyRuleId;
  readonly severity: 'error' | 'warning';
  readonly summary: string;
}

const ruleDefinitions: readonly RuleDefinition[] = [
  definition(
    'design.typography.font-family',
    'Typography uses configured font families.',
    (facts, policy) =>
      facts.filter((fact) => !policy.allowedFontFamilies.includes(fact.fontFamily)),
  ),
  definition(
    'design.typography.scale',
    'Typography sizes use the configured scale.',
    (facts, policy) => facts.filter((fact) => !policy.allowedFontSizes.includes(fact.fontSize)),
  ),
  definition(
    'design.typography.weight',
    'Typography uses configured font weights.',
    (facts, policy) => facts.filter((fact) => !policy.allowedFontWeights.includes(fact.fontWeight)),
  ),
  definition(
    'design.typography.line-height',
    'Typography uses configured line heights.',
    (facts, policy) => facts.filter((fact) => !policy.allowedLineHeights.includes(fact.lineHeight)),
  ),
  definition(
    'design.typography.letter-spacing',
    'Typography uses configured letter spacing.',
    (facts, policy) =>
      facts.filter((fact) => !policy.allowedLetterSpacings.includes(fact.letterSpacing)),
  ),
  definition(
    'design.typography.paragraph-measure',
    'Paragraphs stay within the configured readable measure.',
    (facts, policy) =>
      facts.filter(
        (fact) =>
          fact.paragraphMeasure === null ||
          fact.paragraphMeasure < policy.minimumParagraphMeasure ||
          fact.paragraphMeasure > policy.maximumParagraphMeasure,
      ),
    'warning',
  ),
  definition(
    'design.typography.body-minimum',
    'Body text meets the configured minimum font size.',
    (facts, policy) =>
      facts.filter(
        (fact) => fact.headingLevel === null && fact.fontSize < policy.minimumBodyFontSize,
      ),
  ),
  definition(
    'design.typography.responsive-scale',
    'Responsive text sizes follow the configured scale for their role.',
    (facts, policy) =>
      facts.filter(
        (fact) =>
          fact.responsiveRole === null ||
          !configuredNumberValues(policy.responsiveFontSizes, fact.responsiveRole).includes(
            fact.fontSize,
          ),
      ),
  ),
  definition(
    'design.heading.h1-presence',
    'A page contains the configured minimum number of H1 headings.',
    (facts, policy) =>
      facts.filter((fact) => fact.headingLevel === 1).length < policy.minimumH1Count
        ? facts.slice(0, 1)
        : [],
    'error',
    'design.heading-facts',
  ),
  definition(
    'design.heading.h1-count',
    'A page does not exceed the configured number of H1 headings.',
    (facts, policy) =>
      facts.filter((fact) => fact.headingLevel === 1).length > policy.maximumH1Count
        ? facts.slice(0, 1)
        : [],
    'error',
    'design.heading-facts',
  ),
  definition(
    'design.heading.level-order',
    'Heading levels do not skip hierarchy levels.',
    (facts) =>
      facts.filter(
        (fact, index) =>
          fact.headingLevel !== null &&
          index > 0 &&
          facts[index - 1]?.headingLevel !== null &&
          fact.headingLevel > (facts[index - 1]?.headingLevel ?? 0) + 1,
      ),
    'error',
    'design.heading-facts',
  ),
  definition(
    'design.heading.semantic-style',
    'Heading semantics use a configured visual style.',
    (facts, policy) =>
      facts.filter(
        (fact) =>
          fact.headingLevel !== null &&
          (fact.semanticStyle === null ||
            !configuredStringValues(policy.allowedSemanticStyles, `h${fact.headingLevel}`).includes(
              fact.semanticStyle,
            )),
      ),
    'error',
    'design.heading-facts',
  ),
  definition(
    'design.heading.spacing-before',
    'Headings use configured preceding spacing.',
    (facts, policy) =>
      facts.filter(
        (fact) =>
          fact.headingLevel !== null &&
          (fact.marginBefore === null || !policy.allowedSpacingBefore.includes(fact.marginBefore)),
      ),
    'error',
    'design.heading-facts',
  ),
  definition(
    'design.heading.spacing-after',
    'Headings use configured following spacing.',
    (facts, policy) =>
      facts.filter(
        (fact) =>
          fact.headingLevel !== null &&
          (fact.marginAfter === null || !policy.allowedSpacingAfter.includes(fact.marginAfter)),
      ),
    'error',
    'design.heading-facts',
  ),
  definition(
    'design.heading.text-clipping',
    'Heading text is not clipped in the rendered layout.',
    (facts) => facts.filter((fact) => fact.headingLevel !== null && fact.textClipped !== false),
    'error',
    'design.heading-facts',
  ),
];

/*** Builds one pure generic Rules rule from a Typography fact predicate. */
function createRule(definition: RuleDefinition, policy: TypographyRulePolicy): Rule<DesignContext> {
  return {
    defaultSeverity: definition.severity,
    dependencies: [],
    evaluate: ({ context }) => {
      const observations = typographyObservations(context, definition.capability);
      if (observations.length === 0) {
        return {
          findings: [missingEvidenceFinding(definition.id)],
          status: 'INCOMPLETE',
        };
      }
      const violations = definition.evaluate(observations, policy);
      return violations.length === 0
        ? { findings: [], status: 'PASS' }
        : {
            findings: violations.map((fact) => violationFinding(definition.id, fact)),
            status: 'FAIL',
          };
    },
    identity: { id: definition.id, version: '1.0.0' },
    requiredCapabilities: [definition.capability],
    summary: definition.summary,
  };
}

/*** Creates a Typography rule definition with its capability inferred from its stable ID. */
function definition(
  id: TypographyRuleId,
  summary: string,
  evaluate: RuleDefinition['evaluate'],
  severity: RuleDefinition['severity'] = 'error',
  capability: RuleDefinition['capability'] = 'design.typography-facts',
): RuleDefinition {
  return { capability, evaluate, id, severity, summary };
}

/*** Reads valid normalized Typography observations from available versioned fact envelopes. */
function typographyObservations(
  context: DesignContext,
  capability: RuleDefinition['capability'],
): readonly TypographyObservation[] {
  return (context.facts ?? []).flatMap((fact) =>
    fact.status === 'available' && fact.kind === capability
      ? parseTypographyObservation(fact.value, fact.id)
      : [],
  );
}

/*** Produces a serializable incomplete finding when a rule has no valid measured observation. */
function missingEvidenceFinding(ruleId: TypographyRuleId): RuleFinding {
  return {
    evidence: { reason: 'No valid normalized Typography observation was supplied.' },
    message: `Rule "${ruleId}" is incomplete because Typography evidence is missing.`,
    ruleId,
    severity: 'info',
    subjects: [{ id: 'design-context', kind: 'design-context' }],
  };
}

/*** Produces a serializable finding for one measured Typography policy violation. */
function violationFinding(ruleId: TypographyRuleId, fact: TypographyObservation): RuleFinding {
  return {
    evidence: { observationId: fact.id, viewport: fact.viewport },
    message: `Rule "${ruleId}" is violated by Typography observation "${fact.id}".`,
    ruleId,
    severity: 'error',
    subjects: [{ id: fact.id, kind: 'typography-observation' }],
  };
}

/*** Reads a configured allow-list without treating an unknown role as allowed. */
function configuredNumberValues(
  values: Readonly<Record<string, readonly number[]>>,
  key: string,
): readonly number[] {
  return Object.entries(values).find(([candidate]) => candidate === key)?.[1] ?? [];
}

/*** Reads a configured string allow-list without treating an unknown role as allowed. */
function configuredStringValues(
  values: Readonly<Record<string, readonly string[]>>,
  key: string,
): readonly string[] {
  return Object.entries(values).find(([candidate]) => candidate === key)?.[1] ?? [];
}
