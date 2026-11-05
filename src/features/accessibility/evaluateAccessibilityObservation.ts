type ObservationVerdict = 'FAIL' | 'INCOMPLETE' | 'PASS';
interface AccessibilityObservation {
  readonly kind: string;
  readonly properties: Readonly<Record<string, unknown>>;
}
type ObservationEvaluator = (observation: AccessibilityObservation) => ObservationVerdict;

const ruleEvaluators: readonly (readonly [string, ObservationEvaluator])[] = [
  [
    'design.a11y.accessible-name',
    (o) => booleanVerdict(o, 'control', o.properties.hasAccessibleName),
  ],
  [
    'design.a11y.form-label',
    (o) => booleanVerdict(o, 'form-field', o.properties.hasProgrammaticLabel),
  ],
  [
    'design.a11y.error-association',
    (o) => stringVerdict(o, 'validation-error', o.properties.associatedFieldId),
  ],
  [
    'design.a11y.keyboard-reachability',
    (o) => booleanVerdict(o, 'interactive-element', o.properties.keyboardReachable),
  ],
  [
    'design.a11y.focus-order',
    (o) => classificationVerdict(o, 'focus-sequence', o.properties.order, 'meaningful', 'invalid'),
  ],
  [
    'design.a11y.color-only',
    (o) => booleanVerdict(o, 'information-cue', o.properties.hasNonColorIndicator),
  ],
  [
    'design.a11y.reduced-motion',
    (o) =>
      classificationVerdict(
        o,
        'motion-response',
        o.properties.reducedMotion,
        'respected',
        'ignored',
      ),
  ],
  ['design.a11y.landmarks', landmarkVerdict],
  ['design.a11y.main-landmark', mainLandmarkVerdict],
  ['design.a11y.list-semantics', listSemanticsVerdict],
  ['design.a11y.button-link-semantics', buttonLinkVerdict],
  ['design.a11y.status-feedback', statusFeedbackVerdict],
  ['design.a11y.text-alternatives', textAlternativesVerdict],
];

/*** Evaluates one normalized observation against its frozen Accessibility rule meaning. */
export function evaluateAccessibilityObservation(
  ruleId: string,
  observation: AccessibilityObservation,
): ObservationVerdict {
  return ruleEvaluators.find(([id]) => id === ruleId)?.[1](observation) ?? 'INCOMPLETE';
}
/*** Evaluates one boolean semantic property when it belongs to the expected observation kind. */
function booleanVerdict(
  o: AccessibilityObservation,
  kind: string,
  value: unknown,
): ObservationVerdict {
  return o.kind !== kind || typeof value !== 'boolean' ? 'INCOMPLETE' : value ? 'PASS' : 'FAIL';
}
/*** Evaluates a non-empty string semantic property when it belongs to the expected observation kind. */
function stringVerdict(
  o: AccessibilityObservation,
  kind: string,
  value: unknown,
): ObservationVerdict {
  return o.kind !== kind || typeof value !== 'string'
    ? 'INCOMPLETE'
    : value.trim() === ''
      ? 'FAIL'
      : 'PASS';
}
/*** Evaluates a finite semantic classification while leaving unknown classifications incomplete. */
function classificationVerdict(
  o: AccessibilityObservation,
  kind: string,
  value: unknown,
  passing: string,
  failing: string,
): ObservationVerdict {
  return o.kind !== kind || typeof value !== 'string'
    ? 'INCOMPLETE'
    : value === passing
      ? 'PASS'
      : value === failing
        ? 'FAIL'
        : 'INCOMPLETE';
}
/*** Evaluates whether a measured landmark has a valid semantic role and name. */
function landmarkVerdict(o: AccessibilityObservation): ObservationVerdict {
  const { hasAccessibleName, role } = o.properties;
  return o.kind !== 'landmark' || typeof role !== 'string' || typeof hasAccessibleName !== 'boolean'
    ? 'INCOMPLETE'
    : [
          'banner',
          'complementary',
          'contentinfo',
          'form',
          'main',
          'navigation',
          'region',
          'search',
        ].includes(role) &&
        (role !== 'region' || hasAccessibleName)
      ? 'PASS'
      : 'FAIL';
}
/*** Evaluates whether the measured page landmark summary identifies exactly one main region. */
function mainLandmarkVerdict(o: AccessibilityObservation): ObservationVerdict {
  const { mainCount } = o.properties;
  return o.kind !== 'landmark-summary' || typeof mainCount !== 'number'
    ? 'INCOMPLETE'
    : mainCount === 1
      ? 'PASS'
      : 'FAIL';
}
/*** Evaluates whether a measured list exposes list and listitem semantics together. */
function listSemanticsVerdict(o: AccessibilityObservation): ObservationVerdict {
  const { itemRoles, role } = o.properties;
  return o.kind !== 'list' ||
    !Array.isArray(itemRoles) ||
    itemRoles.some((itemRole) => typeof itemRole !== 'string')
    ? 'INCOMPLETE'
    : role === 'list' &&
        itemRoles.length > 0 &&
        itemRoles.every((itemRole) => itemRole === 'listitem')
      ? 'PASS'
      : 'FAIL';
}
/*** Evaluates whether measured buttons and links expose behavior matching their semantic role. */
function buttonLinkVerdict(o: AccessibilityObservation): ObservationVerdict {
  const { behavior, role } = o.properties;
  return o.kind !== 'interactive-control' ||
    typeof role !== 'string' ||
    typeof behavior !== 'string'
    ? 'INCOMPLETE'
    : (role === 'button' && behavior === 'action') || (role === 'link' && behavior === 'navigation')
      ? 'PASS'
      : 'FAIL';
}
/*** Evaluates whether a measured dynamic status uses an announcing live-region role. */
function statusFeedbackVerdict(o: AccessibilityObservation): ObservationVerdict {
  const { isAnnounced, role } = o.properties;
  return o.kind !== 'status-message' || typeof role !== 'string' || typeof isAnnounced !== 'boolean'
    ? 'INCOMPLETE'
    : ['alert', 'log', 'status'].includes(role) && isAnnounced
      ? 'PASS'
      : 'FAIL';
}
/*** Evaluates alternatives for meaningful media and the omission expected for decorative media. */
function textAlternativesVerdict(o: AccessibilityObservation): ObservationVerdict {
  const { isDecorative, textAlternative } = o.properties;
  return o.kind !== 'media' ||
    typeof isDecorative !== 'boolean' ||
    (textAlternative !== undefined && typeof textAlternative !== 'string')
    ? 'INCOMPLETE'
    : isDecorative
      ? textAlternative === undefined || textAlternative.trim() === ''
        ? 'PASS'
        : 'FAIL'
      : typeof textAlternative === 'string' && textAlternative.trim() !== ''
        ? 'PASS'
        : 'FAIL';
}
