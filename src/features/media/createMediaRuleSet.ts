import type { FactEnvelope } from '@ankhorage/contracts/rules';
import type { JsonValue, Rule, RuleEvaluationOutcome, RuleScope, RuleSet } from '@ankhorage/rules';

import { type MediaRuleDefinition, mediaRuleDefinitions } from './mediaRuleDefinitions';

/*** Creates the independently composable Images and Media rule contribution from portable facts. */
export function createMediaRuleSet(): RuleSet<MediaRuleContext> {
  return {
    id: 'ankhorage.rules-design.media',
    rules: mediaRuleDefinitions.map(createMediaRule),
  };
}

interface MediaRuleContext {
  readonly facts: readonly FactEnvelope[];
}

interface MediaAssessment {
  readonly id: string;
  readonly value: Readonly<Record<string, JsonValue>>;
}

/*** Builds one pure generic Rule from a fixed catalog media identifier. */
function createMediaRule(definition: MediaRuleDefinition): Rule<MediaRuleContext> {
  return {
    defaultSeverity: definition.id === 'design.media.focal-point' ? 'warning' : 'error',
    dependencies: [],
    evaluate: ({ context, scope }) => evaluateMediaRule(definition, context, scope),
    identity: { id: definition.id, version: '1.0.0' },
    requiredCapabilities: ['media.metadata'],
    summary: definition.summary,
  };
}

/*** Evaluates all complete, scope-matching assessments without fabricating unavailable measurements. */
function evaluateMediaRule(
  definition: MediaRuleDefinition,
  context: MediaRuleContext,
  scope: RuleScope,
): RuleEvaluationOutcome {
  const scopedFacts = context.facts.filter((fact) => matchesMediaScope(fact, scope));
  if (scopedFacts.length === 0)
    return incomplete(definition.id, 'No media assessment fact exists for this scope.');
  if (scopedFacts.some((fact) => fact.status === 'missing')) {
    return incomplete(definition.id, 'A media assessment fact is explicitly unavailable.');
  }

  const assessments = scopedFacts.flatMap(toMediaAssessment);
  if (assessments.length !== scopedFacts.length) {
    return incomplete(definition.id, 'A media assessment fact has an invalid serializable value.');
  }

  const checks = assessments.map((assessment) => evaluateAssessment(definition.id, assessment));
  if (checks.some((check) => check === null)) {
    return incomplete(
      definition.id,
      'A media assessment lacks the measurements required by this rule.',
    );
  }

  const failures = checks.filter((check): check is MediaCheck => check !== null && !check.passed);
  return failures.length === 0
    ? { findings: [], status: 'PASS' }
    : {
        findings: failures.map((failure) => ({
          evidence: failure.evidence,
          message: failure.message,
          ruleId: definition.id,
          severity: 'error',
          subjects: [{ id: failure.mediaId, kind: 'media' }],
        })),
        status: 'FAIL',
      };
}

interface MediaCheck {
  readonly evidence: JsonValue;
  readonly mediaId: string;
  readonly message: string;
  readonly passed: boolean;
}

type MediaValueSelector = (value: Readonly<Record<string, JsonValue>>) => JsonValue | undefined;

/*** Evaluates one rule-specific predicate from one normalized media assessment. */
function evaluateAssessment(id: string, assessment: MediaAssessment): MediaCheck | null {
  const measured = evaluateMeasuredAssessment(id, assessment);
  if (measured !== undefined) return measured;
  switch (id) {
    case 'design.media.resolution-fit':
      return resolutionFit(assessment);
    case 'design.media.focal-point':
      return booleanCheck(
        assessment,
        (value) => value.focalPointPreserved,
        'focal point preservation',
      );
    case 'design.media.responsive-sources':
      return booleanCheck(
        assessment,
        (value) => value.hasResponsiveSource,
        'responsive source availability',
      );
    case 'design.media.decorative-vs-content':
      return decorativeClassification(assessment);
    default:
      return null;
  }
}

/*** Evaluates the media checks that compare supplied measurements to configured values. */
function evaluateMeasuredAssessment(
  id: string,
  assessment: MediaAssessment,
): MediaCheck | null | undefined {
  switch (id) {
    case 'design.media.aspect-ratio':
      return equalNumbers(
        assessment,
        (value) => value.actualAspectRatio,
        (value) => value.expectedAspectRatio,
        'aspect ratio',
      );
    case 'design.media.intrinsic-size':
      return positiveDimensions(
        assessment,
        (value) => value.intrinsicWidth,
        (value) => value.intrinsicHeight,
        'intrinsic dimensions',
      );
    case 'design.media.object-fit':
      return compareStrings(
        assessment,
        (value) => value.actualObjectFit,
        (value) => value.expectedObjectFit,
        'object fit',
      );
    case 'design.media.overlay-legibility':
      return compareNumbers(
        assessment,
        (value) => value.overlayContrastRatio,
        (value) => value.minimumOverlayContrastRatio,
        'overlay contrast',
      );
    case 'design.media.icon-sizing':
      return equalNumbers(
        assessment,
        (value) => value.actualIconSize,
        (value) => value.expectedIconSize,
        'icon size',
      );
    default:
      return undefined;
  }
}

/*** Matches only media facts observed for the exact evaluation scope. */
function matchesMediaScope(fact: FactEnvelope, scope: RuleScope): boolean {
  return (
    fact.kind === 'design.media.assessment' &&
    fact.scope.id === scope.id &&
    fact.scope.kind === scope.kind
  );
}

/*** Parses one available frozen fact into its minimal rule-owned media shape. */
function toMediaAssessment(fact: FactEnvelope): readonly MediaAssessment[] {
  if (fact.status !== 'available' || !isSerializableRecord(fact.value)) return [];
  const { value } = fact;
  const mediaId = asString(value.mediaId);
  return mediaId === null ? [] : [{ id: mediaId, value }];
}

/*** Compares two finite numeric media measurements where the first must meet the second. */
function compareNumbers(
  assessment: MediaAssessment,
  actualSelector: MediaValueSelector,
  expectedSelector: MediaValueSelector,
  label: string,
): MediaCheck | null {
  const actual = asFiniteNumber(actualSelector(assessment.value));
  const expected = asFiniteNumber(expectedSelector(assessment.value));
  if (actual === null || expected === null || expected <= 0) return null;
  return check(assessment, actual >= expected, label, actual, expected);
}

/*** Compares two finite numeric media measurements that must be exactly configured. */
function equalNumbers(
  assessment: MediaAssessment,
  actualSelector: MediaValueSelector,
  expectedSelector: MediaValueSelector,
  label: string,
): MediaCheck | null {
  const actual = asFiniteNumber(actualSelector(assessment.value));
  const expected = asFiniteNumber(expectedSelector(assessment.value));
  if (actual === null || expected === null || expected <= 0) return null;
  return check(assessment, actual === expected, label, actual, expected);
}

/*** Requires two positive intrinsic dimensions without inferring absent metadata. */
function positiveDimensions(
  assessment: MediaAssessment,
  widthSelector: MediaValueSelector,
  heightSelector: MediaValueSelector,
  label: string,
): MediaCheck | null {
  const width = asFiniteNumber(widthSelector(assessment.value));
  const height = asFiniteNumber(heightSelector(assessment.value));
  if (width === null || height === null) return null;
  return check(
    assessment,
    width > 0 && height > 0,
    label,
    { height, width },
    'positive dimensions',
  );
}

/*** Verifies that intrinsic dimensions cover the observed rendered dimensions. */
function resolutionFit(assessment: MediaAssessment): MediaCheck | null {
  const intrinsicWidth = asFiniteNumber(assessment.value.intrinsicWidth);
  const intrinsicHeight = asFiniteNumber(assessment.value.intrinsicHeight);
  const renderedWidth = asFiniteNumber(assessment.value.renderedWidth);
  const renderedHeight = asFiniteNumber(assessment.value.renderedHeight);
  if (
    intrinsicWidth === null ||
    intrinsicHeight === null ||
    renderedWidth === null ||
    renderedHeight === null ||
    renderedWidth <= 0 ||
    renderedHeight <= 0
  ) {
    return null;
  }
  return check(
    assessment,
    intrinsicWidth >= renderedWidth && intrinsicHeight >= renderedHeight,
    'resolution fit',
    { intrinsicHeight, intrinsicWidth },
    { renderedHeight, renderedWidth },
  );
}

/*** Compares resolved and configured media string values. */
function compareStrings(
  assessment: MediaAssessment,
  actualSelector: MediaValueSelector,
  expectedSelector: MediaValueSelector,
  label: string,
): MediaCheck | null {
  const actual = asString(actualSelector(assessment.value));
  const expected = asString(expectedSelector(assessment.value));
  return actual === null || expected === null
    ? null
    : check(assessment, actual === expected, label, actual, expected);
}

/*** Evaluates one explicit boolean observation without treating absence as success. */
function booleanCheck(
  assessment: MediaAssessment,
  selector: MediaValueSelector,
  label: string,
): MediaCheck | null {
  const actual = selector(assessment.value);
  return typeof actual !== 'boolean' ? null : check(assessment, actual, label, actual, true);
}

/*** Requires decorative media to be unnamed and content media to expose a usable name. */
function decorativeClassification(assessment: MediaAssessment): MediaCheck | null {
  const { accessibleName, classification: classificationValue } = assessment.value;
  const classification = asString(classificationValue);
  if (classification !== 'content' && classification !== 'decorative') return null;
  if (accessibleName !== null && typeof accessibleName !== 'string') return null;
  const passed =
    (classification === 'decorative' && accessibleName === null) ||
    (classification === 'content' &&
      typeof accessibleName === 'string' &&
      accessibleName.length > 0);
  return check(
    assessment,
    passed,
    'media classification',
    { accessibleName, classification },
    classification,
  );
}

/*** Creates consistent serializable failure evidence for a measured media predicate. */
function check(
  assessment: MediaAssessment,
  passed: boolean,
  label: string,
  actual: JsonValue,
  expected: JsonValue,
): MediaCheck {
  return {
    evidence: { actual, expected, factId: assessment.id },
    mediaId: assessment.id,
    message: `${assessment.id} has ${label} ${JSON.stringify(actual)} but requires ${JSON.stringify(expected)}.`,
    passed,
  };
}

/*** Creates a deterministic incomplete outcome for absent or invalid factual evidence. */
function incomplete(ruleId: string, message: string): RuleEvaluationOutcome {
  return {
    findings: [
      {
        evidence: { reason: message },
        message,
        ruleId,
        severity: 'info',
        subjects: [{ id: 'media-facts', kind: 'media-facts' }],
      },
    ],
    status: 'INCOMPLETE',
  };
}

/*** Identifies a serializable keyed record without accepting serializable arrays. */
function isSerializableRecord(value: JsonValue): value is Readonly<Record<string, JsonValue>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/*** Narrows a serializable value to a finite numeric observation. */
function asFiniteNumber(value: JsonValue | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/*** Narrows a serializable value to a non-empty string observation. */
function asString(value: JsonValue | undefined): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}
