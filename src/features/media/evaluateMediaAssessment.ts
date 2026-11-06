import type { JsonValue } from '@ankhorage/rules';

import { evaluateMediaApplicability } from './evaluateMediaApplicability';
import type { MediaRuleDefinition } from './mediaRuleDefinitions';

/*** Evaluates one rule-specific predicate from one normalized media assessment. */
export function evaluateMediaAssessment(
  definition: MediaRuleDefinition,
  aspectRatioTolerance: number,
  assessment: MediaAssessment,
): MediaCheck | null {
  const applicability = evaluateMediaApplicability(definition.id, assessment);
  if (applicability !== undefined) return applicability;
  switch (definition.id) {
    case 'design.media.aspect-ratio':
      return aspectRatio(assessment, aspectRatioTolerance);
    case 'design.media.intrinsic-size':
      return positiveDimensions(assessment);
    case 'design.media.resolution-fit':
      return resolutionFit(assessment);
    case 'design.media.object-fit':
      return compareStrings(
        assessment,
        (value) => value.actualObjectFit,
        (value) => value.expectedObjectFit,
        'object fit',
      );
    case 'design.media.focal-point':
      return focalPointPreservation(assessment);
    case 'design.media.responsive-sources':
      return responsiveSourceSelection(assessment);
    case 'design.media.overlay-legibility':
      return contrast(assessment, definition.minimumContrastRatio);
    case 'design.media.icon-sizing':
      return equalNumbers(
        assessment,
        (value) => value.actualIconSize,
        (value) => value.expectedIconSize,
        'icon size',
      );
    case 'design.media.decorative-vs-content':
      return decorativeClassification(assessment);
    default:
      return null;
  }
}

export interface MediaAssessment {
  readonly id: string;
  readonly value: Readonly<Record<string, JsonValue>>;
}

export interface MediaCheck {
  readonly evidence: JsonValue;
  readonly mediaId: string;
  readonly message: string;
  readonly status: 'FAIL' | 'PASS' | 'SKIPPED';
}

type MediaValueSelector = (value: Readonly<Record<string, JsonValue>>) => JsonValue | undefined;

/*** Compares measured and expected aspect ratios with a rule-factory-owned tolerance. */
function aspectRatio(assessment: MediaAssessment, tolerance: number): MediaCheck | null {
  const actual = asFiniteNumber(assessment.value.actualAspectRatio);
  const expected = asPositiveNumber(assessment.value.expectedAspectRatio);
  return actual === null || expected === null
    ? null
    : check(
        assessment,
        Math.abs(actual - expected) <= tolerance + Number.EPSILON,
        'aspect ratio',
        actual,
        {
          expected,
          tolerance,
        },
      );
}

/*** Requires two positive intrinsic dimensions without inferring absent metadata. */
function positiveDimensions(assessment: MediaAssessment): MediaCheck | null {
  const width = asFiniteNumber(assessment.value.intrinsicWidth);
  const height = asFiniteNumber(assessment.value.intrinsicHeight);
  return width === null || height === null
    ? null
    : check(
        assessment,
        width > 0 && height > 0,
        'intrinsic dimensions',
        { height, width },
        'positive dimensions',
      );
}

/*** Verifies that intrinsic dimensions cover the observed rendered dimensions. */
function resolutionFit(assessment: MediaAssessment): MediaCheck | null {
  const intrinsicWidth = asPositiveNumber(assessment.value.intrinsicWidth);
  const intrinsicHeight = asPositiveNumber(assessment.value.intrinsicHeight);
  const renderedWidth = asPositiveNumber(assessment.value.renderedWidth);
  const renderedHeight = asPositiveNumber(assessment.value.renderedHeight);
  return intrinsicWidth === null ||
    intrinsicHeight === null ||
    renderedWidth === null ||
    renderedHeight === null
    ? null
    : check(
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

/*** Verifies that a normalized focal point lies within the measured visible crop bounds. */
function focalPointPreservation(assessment: MediaAssessment): MediaCheck | null {
  const focalPointX = asUnitInterval(assessment.value.focalPointX);
  const focalPointY = asUnitInterval(assessment.value.focalPointY);
  const visibleLeft = asUnitInterval(assessment.value.visibleLeft);
  const visibleRight = asUnitInterval(assessment.value.visibleRight);
  const visibleTop = asUnitInterval(assessment.value.visibleTop);
  const visibleBottom = asUnitInterval(assessment.value.visibleBottom);
  if (
    focalPointX === null ||
    focalPointY === null ||
    visibleLeft === null ||
    visibleRight === null ||
    visibleTop === null ||
    visibleBottom === null ||
    visibleLeft > visibleRight ||
    visibleTop > visibleBottom
  )
    return null;
  return check(
    assessment,
    focalPointX >= visibleLeft &&
      focalPointX <= visibleRight &&
      focalPointY >= visibleTop &&
      focalPointY <= visibleBottom,
    'focal point visibility',
    { focalPointX, focalPointY },
    { visibleBottom, visibleLeft, visibleRight, visibleTop },
  );
}

/*** Verifies a measured responsive source selection covers the rendered pixel demand. */
function responsiveSourceSelection(assessment: MediaAssessment): MediaCheck | null {
  const renderedWidth = asPositiveNumber(assessment.value.renderedWidth);
  const devicePixelRatio = asPositiveNumber(assessment.value.devicePixelRatio);
  const selectedSourceWidth = asPositiveNumber(assessment.value.selectedSourceWidth);
  const sourceWidths = asDistinctPositiveNumbers(assessment.value.sourceWidths);
  if (
    renderedWidth === null ||
    devicePixelRatio === null ||
    selectedSourceWidth === null ||
    sourceWidths === null ||
    sourceWidths.length < 2 ||
    !sourceWidths.includes(selectedSourceWidth)
  )
    return null;
  const requiredWidth = renderedWidth * devicePixelRatio;
  const closestSufficientSource = sourceWidths
    .filter((width) => width >= requiredWidth)
    .reduce<number | null>(
      (closest, width) => (closest === null || width < closest ? width : closest),
      null,
    );
  return closestSufficientSource === null
    ? check(
        assessment,
        false,
        'responsive source selection',
        { selectedSourceWidth, sourceWidths },
        { requiredWidth },
      )
    : check(
        assessment,
        selectedSourceWidth === closestSufficientSource,
        'responsive source selection',
        { selectedSourceWidth, sourceWidths },
        { requiredWidth, selectedSourceWidth: closestSufficientSource },
      );
}

/*** Uses the media-rule-owned contrast threshold instead of an adapter-supplied requirement. */
function contrast(
  assessment: MediaAssessment,
  minimumContrastRatio: number | undefined,
): MediaCheck | null {
  const actual = asFiniteNumber(assessment.value.overlayContrastRatio);
  return actual === null || minimumContrastRatio === undefined
    ? null
    : check(
        assessment,
        actual >= minimumContrastRatio,
        'overlay contrast',
        actual,
        minimumContrastRatio,
      );
}

/*** Compares two finite numeric media measurements that must be exactly configured. */
function equalNumbers(
  assessment: MediaAssessment,
  actualSelector: MediaValueSelector,
  expectedSelector: MediaValueSelector,
  label: string,
): MediaCheck | null {
  const actual = asFiniteNumber(actualSelector(assessment.value));
  const expected = asPositiveNumber(expectedSelector(assessment.value));
  return actual === null || expected === null
    ? null
    : check(assessment, actual === expected, label, actual, expected);
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
    status: passed ? 'PASS' : 'FAIL',
  };
}

/*** Narrows a serializable value to a finite numeric observation. */
function asFiniteNumber(value: JsonValue | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/*** Narrows a positive finite numeric observation. */
function asPositiveNumber(value: JsonValue | undefined): number | null {
  const number = asFiniteNumber(value);
  return number !== null && number > 0 ? number : null;
}

/*** Narrows a finite normalized coordinate between zero and one. */
function asUnitInterval(value: JsonValue | undefined): number | null {
  const number = asFiniteNumber(value);
  return number !== null && number >= 0 && number <= 1 ? number : null;
}

/*** Narrows a JSON numeric array to distinct positive source widths. */
function asDistinctPositiveNumbers(value: JsonValue | undefined): readonly number[] | null {
  if (!Array.isArray(value)) return null;
  const numbers = value.map(asPositiveNumber);
  return numbers.some((number) => number === null) || new Set(numbers).size !== numbers.length
    ? null
    : (numbers as readonly number[]);
}

/*** Narrows a serializable value to a non-empty string observation. */
function asString(value: JsonValue | undefined): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}
