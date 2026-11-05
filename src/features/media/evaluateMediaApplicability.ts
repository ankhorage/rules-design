import type { JsonValue } from '@ankhorage/rules';

import type { MediaAssessment, MediaCheck } from './evaluateMediaAssessment';

/*** Evaluates policy-owned evidence that can prove a media rule does not apply. */
export function evaluateMediaApplicability(
  ruleId: string,
  assessment: MediaAssessment,
): MediaCheck | null | undefined {
  switch (ruleId) {
    case 'design.media.focal-point':
      return focalPointApplicability(assessment);
    case 'design.media.responsive-sources':
      return responsiveSourcesApplicability(assessment);
    case 'design.media.overlay-legibility':
      return textOverlayApplicability(assessment);
    case 'design.media.icon-sizing':
      return iconApplicability(assessment);
    default:
      return undefined;
  }
}

/*** Resolves a declared focal-point characteristic without trusting generic adapter flags. */
function focalPointApplicability(assessment: MediaAssessment): MediaCheck | null | undefined {
  const { hasFocalPoint } = assessment.value;
  return booleanCharacteristic(
    assessment,
    Object.hasOwn(assessment.value, 'hasFocalPoint'),
    hasFocalPoint,
    'no declared focal point',
  );
}

/*** Resolves a declared responsive-source characteristic without inferring it from absent widths. */
function responsiveSourcesApplicability(
  assessment: MediaAssessment,
): MediaCheck | null | undefined {
  const { hasResponsiveSources } = assessment.value;
  return booleanCharacteristic(
    assessment,
    Object.hasOwn(assessment.value, 'hasResponsiveSources'),
    hasResponsiveSources,
    'no responsive source set',
  );
}

/*** Resolves a declared text-overlay characteristic without trusting generic adapter flags. */
function textOverlayApplicability(assessment: MediaAssessment): MediaCheck | null | undefined {
  const { hasTextOverlay } = assessment.value;
  return booleanCharacteristic(
    assessment,
    Object.hasOwn(assessment.value, 'hasTextOverlay'),
    hasTextOverlay,
    'no text overlay',
  );
}

/*** Accepts a boolean characteristic only when the assessed media explicitly declared it. */
function booleanCharacteristic(
  assessment: MediaAssessment,
  isDeclared: boolean,
  value: JsonValue,
  reason: string,
): MediaCheck | null | undefined {
  if (!isDeclared || value === true) return undefined;
  return value === false ? skippedCheck(assessment, reason) : null;
}

/*** Applies icon sizing only to media whose validated kind establishes it is not an icon. */
function iconApplicability(assessment: MediaAssessment): MediaCheck | null | undefined {
  const { mediaKind } = assessment.value;
  if (!Object.hasOwn(assessment.value, 'mediaKind') || mediaKind === 'icon') return undefined;
  return mediaKind === 'image' ? skippedCheck(assessment, 'media is not an icon') : null;
}

/*** Records a rule-specific, validated reason why one media assessment has no policy obligation. */
function skippedCheck(assessment: MediaAssessment, reason: string): MediaCheck {
  return {
    evidence: { factId: assessment.id, reason },
    mediaId: assessment.id,
    message: `${assessment.id} is not applicable because ${reason}.`,
    status: 'SKIPPED',
  };
}
