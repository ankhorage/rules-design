import type { JsonValue, RuleSubject } from '@ankhorage/rules';
import { isRecord } from '@ankhorage/utility/object';

import type {
  AssessmentFact,
  AssessmentFinding,
  AssessmentResult,
  WebsiteAssessmentRuleOptions,
} from '../../types/websiteAssessment';
import { validatedWebsiteAssessmentValues } from './isWebsiteAssessmentNonNull';
import { websiteAssessmentResult } from './websiteAssessmentResult';
import { websiteAssessmentValues } from './websiteAssessmentValues';

/*** Applies an explicit regional policy to complete tracking runtime observations. */
export function assessTrackingConsent(
  facts: readonly AssessmentFact[],
  options: WebsiteAssessmentRuleOptions,
): AssessmentResult {
  const policy = options.trackingConsentPolicy;
  const observations = validatedWebsiteAssessmentValues(
    facts.map((fact) => trackingObservation(fact.value, fact.id)),
  );
  if (policy === undefined || observations === null) return websiteAssessmentResult(null);
  return websiteAssessmentResult(
    observations.flatMap((observation) =>
      trackingFails(observation, policy) ? [trackingFinding(observation, policy)] : [],
    ),
  );
}

interface TrackingObservation {
  readonly id: string;
  readonly states: readonly TrackingState[];
  readonly subject: RuleSubject;
}
interface TrackingState {
  readonly observed: boolean;
  readonly state: 'accepted' | 'before-choice' | 'rejected' | 'withdrawn';
}

/*** Parses fully covered tracking state observations. */
function trackingObservation(
  value: Readonly<Record<string, JsonValue>>,
  id: string,
): TrackingObservation | null {
  const subject = websiteAssessmentValues.subject(value.subject);
  if (value.version !== 1 || subject === null || !Array.isArray(value.states)) return null;
  const states = validatedWebsiteAssessmentValues(value.states.map(trackingState));
  if (states === null) return null;
  return value.classification === 'essential-only'
    ? { id, states: [], subject }
    : value.classification === 'optional' && hasCompleteConsentCoverage(states)
      ? { id, states, subject }
      : null;
}

/*** Requires observations for each state that establishes an optional-tracking decision. */
function hasCompleteConsentCoverage(states: readonly TrackingState[]): boolean {
  return ['accepted', 'before-choice', 'rejected'].every((requiredState) =>
    states.some((state) => state.state === requiredState),
  );
}

/*** Validates one complete runtime state without retaining tracker values. */
function trackingState(value: JsonValue): TrackingState | null {
  return isRecord(value) &&
    (value.state === 'before-choice' ||
      value.state === 'rejected' ||
      value.state === 'accepted' ||
      value.state === 'withdrawn') &&
    typeof value.optionalTrackingObserved === 'boolean' &&
    value.covered === true
    ? { observed: value.optionalTrackingObserved, state: value.state }
    : null;
}

/*** Applies prior-consent and rejection behavior without assuming a jurisdiction. */
function trackingFails(
  observation: TrackingObservation,
  policy: NonNullable<WebsiteAssessmentRuleOptions['trackingConsentPolicy']>,
): boolean {
  return policy === 'eu-eea-prior-consent'
    ? observation.states
        .filter((state) => state.state === 'before-choice' || state.state === 'rejected')
        .some((state) => state.observed)
    : observation.states.some((state) => state.state === 'rejected' && state.observed);
}

/*** Creates a stable tracking evidence code with no cookie values. */
function trackingFinding(
  observation: TrackingObservation,
  policy: NonNullable<WebsiteAssessmentRuleOptions['trackingConsentPolicy']>,
): AssessmentFinding {
  return {
    evidence: {
      issue:
        policy === 'eu-eea-prior-consent'
          ? 'tracking-before-consent-or-after-rejection'
          : 'tracking-after-rejection',
      observationId: observation.id,
    },
    message:
      'Optional tracking was observed in a state disallowed by the configured consent policy.',
    subject: observation.subject,
  };
}
