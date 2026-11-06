import type {
  Rule,
  RuleEvaluationOutcome,
  RuleFinding,
  RuleScope,
  RuleSet,
} from '@ankhorage/rules';

import type { DesignContext } from '../../types/designRuleProvider';
import type { TypographyObservation, TypographyRulePolicy } from '../../types/typography';
import { createTypographyObservationTools } from './createTypographyObservationTools';
import { parseTypographyObservation } from './parseTypographyObservation';
import { validateTypographyRulePolicy } from './validateTypographyRulePolicy';

export type { TypographyRulePolicy } from '../../types/typography';

const typographyObservationTools = createTypographyObservationTools();

/*** Creates the independent Typography and Heading RuleSet from explicit serialized-fact policy. */
export function createTypographyRuleSet(policy: TypographyRulePolicy): RuleSet<DesignContext> {
  validateTypographyRulePolicy(policy);
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

interface RuleDefinition {
  readonly capability: 'design.heading-facts' | 'design.typography-facts';
  readonly evaluate: (
    observations: readonly TypographyObservation[],
    policy: TypographyRulePolicy,
  ) => readonly TypographyObservation[];
  readonly id: TypographyRuleId;
  readonly measurementsComplete: (observations: readonly TypographyObservation[]) => boolean;
  readonly severity: 'error' | 'warning';
  readonly summary: string;
}

const ruleDefinitions: readonly RuleDefinition[] = [
  definition(
    'design.typography.font-family',
    'Typography uses configured font families.',
    (facts, policy) =>
      facts.filter((fact) => !policy.allowedFontFamilies.includes(fact.fontFamily)),
    requiredMeasurements('fontFamily'),
  ),
  definition(
    'design.typography.scale',
    'Typography sizes use the configured scale.',
    (facts, policy) => facts.filter((fact) => !policy.allowedFontSizes.includes(fact.fontSize)),
    requiredMeasurements('fontSize'),
  ),
  definition(
    'design.typography.weight',
    'Typography uses configured font weights.',
    (facts, policy) => facts.filter((fact) => !policy.allowedFontWeights.includes(fact.fontWeight)),
    requiredMeasurements('fontWeight'),
  ),
  definition(
    'design.typography.line-height',
    'Typography uses configured line heights.',
    (facts, policy) => facts.filter((fact) => !policy.allowedLineHeights.includes(fact.lineHeight)),
    requiredMeasurements('lineHeight'),
  ),
  definition(
    'design.typography.letter-spacing',
    'Typography uses configured letter spacing.',
    (facts, policy) =>
      facts.filter((fact) => !policy.allowedLetterSpacings.includes(fact.letterSpacing)),
    requiredMeasurements('letterSpacing'),
  ),
  definition(
    'design.typography.paragraph-measure',
    'Paragraphs stay within the configured readable measure.',
    (facts, policy) =>
      facts.filter(
        (fact) =>
          fact.paragraphMeasure !== null &&
          (fact.paragraphMeasure < policy.minimumParagraphMeasure ||
            fact.paragraphMeasure > policy.maximumParagraphMeasure),
      ),
    requiredMeasurements('paragraphMeasure'),
    'warning',
  ),
  definition(
    'design.typography.body-minimum',
    'Body text meets the configured minimum font size.',
    (facts, policy) =>
      facts.filter(
        (fact) => fact.headingLevel === null && fact.fontSize < policy.minimumBodyFontSize,
      ),
    () => true,
  ),
  definition(
    'design.typography.responsive-scale',
    'Responsive text sizes follow the configured scale for their role.',
    (facts, policy) =>
      facts.filter(
        (fact) =>
          fact.responsiveRole !== null &&
          !configuredValues(policy.responsiveFontSizes, fact.responsiveRole).includes(
            fact.fontSize,
          ),
      ),
    requiredMeasurements('responsiveRole', 'fontSize'),
  ),
  definition(
    'design.heading.h1-presence',
    'A page contains the configured minimum number of H1 headings.',
    (facts, policy) =>
      typographyObservationTools
        .viewports(facts)
        .flatMap((factsForViewport) =>
          factsForViewport.filter((fact) => fact.headingLevel === 1).length < policy.minimumH1Count
            ? factsForViewport.slice(0, 1)
            : [],
        ),
    requiredMeasurements('headingLevel', 'viewport'),
    'error',
    'design.heading-facts',
  ),
  definition(
    'design.heading.h1-count',
    'A page does not exceed the configured number of H1 headings.',
    (facts, policy) =>
      typographyObservationTools.viewports(facts).flatMap((factsForViewport) => {
        const h1Headings = typographyObservationTools
          .orderedHeadings(factsForViewport)
          .filter((fact) => fact.headingLevel === 1);
        return h1Headings.slice(policy.maximumH1Count);
      }),
    requiredMeasurements('documentOrder', 'headingLevel', 'viewport'),
    'error',
    'design.heading-facts',
  ),
  definition(
    'design.heading.level-order',
    'Heading levels do not skip hierarchy levels.',
    (facts) =>
      typographyObservationTools
        .viewports(facts)
        .flatMap((factsForViewport) =>
          typographyObservationTools
            .orderedHeadings(factsForViewport)
            .filter(
              (fact, index, ordered) =>
                index > 0 && fact.headingLevel > (ordered[index - 1]?.headingLevel ?? 0) + 1,
            ),
        ),
    requiredMeasurements('documentOrder', 'headingLevel'),
    'error',
    'design.heading-facts',
  ),
  definition(
    'design.heading.semantic-style',
    'Heading semantics use a configured visual style.',
    (facts, policy) =>
      facts.filter(
        (fact) =>
          fact.semanticStyle !== null &&
          !configuredValues(policy.allowedSemanticStyles, `h${fact.headingLevel}`).includes(
            fact.semanticStyle,
          ),
      ),
    requiredMeasurements('headingLevel', 'semanticStyle'),
    'error',
    'design.heading-facts',
  ),
  definition(
    'design.heading.spacing-before',
    'Headings use configured preceding spacing.',
    (facts, policy) =>
      facts.filter(
        (fact) =>
          fact.marginBefore !== null && !policy.allowedSpacingBefore.includes(fact.marginBefore),
      ),
    requiredMeasurements('headingLevel', 'marginBefore'),
    'error',
    'design.heading-facts',
  ),
  definition(
    'design.heading.spacing-after',
    'Headings use configured following spacing.',
    (facts, policy) =>
      facts.filter(
        (fact) =>
          fact.marginAfter !== null && !policy.allowedSpacingAfter.includes(fact.marginAfter),
      ),
    requiredMeasurements('headingLevel', 'marginAfter'),
    'error',
    'design.heading-facts',
  ),
  definition(
    'design.heading.text-clipping',
    'Heading text is not clipped in the rendered layout.',
    (facts) => facts.filter((fact) => fact.textClipped === true),
    requiredMeasurements('headingLevel', 'textClipped'),
    'error',
    'design.heading-facts',
  ),
];

/*** Builds one pure generic Rules rule from a Typography fact predicate. */
function createRule(definition: RuleDefinition, policy: TypographyRulePolicy): Rule<DesignContext> {
  return {
    defaultSeverity: definition.severity,
    dependencies: [],
    evaluate: ({ context, scope }) => {
      const [complete, observations] = typographyEvidence(context, definition.capability, scope);
      if (!complete || observations.length === 0 || !definition.measurementsComplete(observations))
        return incomplete(definition.id);
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
  measurementsComplete: RuleDefinition['measurementsComplete'],
  severity: RuleDefinition['severity'] = 'error',
  capability: RuleDefinition['capability'] = 'design.typography-facts',
): RuleDefinition {
  return { capability, evaluate, id, measurementsComplete, severity, summary };
}

/*** Reads scoped Typography facts without discarding malformed or unavailable evidence. */
function typographyEvidence(
  context: DesignContext,
  capability: RuleDefinition['capability'],
  scope: RuleScope,
): readonly [boolean, readonly TypographyObservation[]] {
  const factObservations = context.facts
    .filter(
      (fact) =>
        fact.kind === capability && fact.scope.id === scope.id && fact.scope.kind === scope.kind,
    )
    .map((fact) =>
      fact.status === 'available' ? parseTypographyObservation(fact.value, fact.id) : [],
    );
  return [
    factObservations.every((observations) => observations.length > 0),
    factObservations.flat(),
  ];
}

/*** Returns an explicit incomplete outcome when required measurements cannot support a verdict. */
function incomplete(ruleId: TypographyRuleId): RuleEvaluationOutcome {
  return { findings: [missingEvidenceFinding(ruleId)], status: 'INCOMPLETE' };
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
function configuredValues<T>(
  values: Readonly<Record<string, readonly T[]>>,
  key: string,
): readonly T[] {
  return Object.entries(values).find(([candidate]) => candidate === key)?.[1] ?? [];
}

/*** Builds a completeness predicate from one frozen rule's required measurements. */
function requiredMeasurements(
  ...keys: readonly (keyof TypographyObservation)[]
): RuleDefinition['measurementsComplete'] {
  return (observations) => typographyObservationTools.measurementsComplete(observations, keys);
}
