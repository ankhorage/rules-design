import type { JsonValue, RuleSubject } from '@ankhorage/rules';
import { isStringArray } from '@ankhorage/utility/array';

import type {
  AssessmentFact,
  AssessmentFinding,
  AssessmentResult,
  WebsiteAssessmentRuleOptions,
} from '../../types/websiteAssessment';
import { validatedWebsiteAssessmentValues } from './isWebsiteAssessmentNonNull';
import { websiteAssessmentResult } from './websiteAssessmentResult';
import { websiteAssessmentValues } from './websiteAssessmentValues';

type PrivacyPurpose = 'analytics' | 'contact';

/*** Compares declared privacy purposes with observed processing purposes. */
export function assessPrivacyNotice(
  facts: readonly AssessmentFact[],
  options: WebsiteAssessmentRuleOptions,
): AssessmentResult {
  const observations = validatedWebsiteAssessmentValues(
    facts.map((fact) => privacyNoticeObservation(fact.value, fact.id)),
  );
  if (options.privacyNoticePolicy === undefined || observations === null)
    return websiteAssessmentResult(null);
  return options.privacyNoticePolicy === 'not-required'
    ? websiteAssessmentResult([])
    : websiteAssessmentResult(
        observations.flatMap((observation) =>
          observation.global &&
          observation.reachable &&
          observation.observed.every((purpose) => observation.declared.includes(purpose))
            ? []
            : [privacyNoticeFinding(observation)],
        ),
      );
}

interface PrivacyNoticeObservation {
  readonly declared: readonly PrivacyPurpose[];
  readonly global: boolean;
  readonly id: string;
  readonly observed: readonly PrivacyPurpose[];
  readonly reachable: boolean;
  readonly subject: RuleSubject;
}

/*** Parses privacy facts using the fixed policy-purpose vocabulary. */
function privacyNoticeObservation(
  value: Readonly<Record<string, JsonValue>>,
  id: string,
): PrivacyNoticeObservation | null {
  const declared = privacyPurposesFrom(value.declaredPurposes);
  const observed = privacyPurposesFrom(value.observedPurposes);
  const subject = websiteAssessmentValues.subject(value.subject);
  return value.version === 1 &&
    typeof value.global === 'boolean' &&
    typeof value.reachable === 'boolean' &&
    declared !== null &&
    observed !== null &&
    subject !== null
    ? { declared, global: value.global, id, observed, reachable: value.reachable, subject }
    : null;
}

/*** Accepts only the policy-owned declared and observed processing vocabulary. */
function privacyPurposesFrom(value: JsonValue | undefined): readonly PrivacyPurpose[] | null {
  if (!isStringArray(value)) return null;
  const purposes = value.map(privacyPurpose);
  return validatedWebsiteAssessmentValues(purposes);
}

/*** Narrows one declared processing purpose to the policy-owned vocabulary. */
function privacyPurpose(value: string): PrivacyPurpose | null {
  return value === 'analytics' || value === 'contact' ? value : null;
}

/*** Creates non-sensitive evidence for a missing privacy declaration. */
function privacyNoticeFinding(observation: PrivacyNoticeObservation): AssessmentFinding {
  return {
    evidence: {
      issue: !observation.reachable
        ? 'unreachable'
        : !observation.global
          ? 'not-site-wide'
          : 'undeclared-processing',
      noticeId: observation.id,
      observedPurposeCount: observation.observed.length,
    },
    message:
      'The privacy notice is unreachable, not site-wide, or omits an observed processing purpose.',
    subject: observation.subject,
  };
}
