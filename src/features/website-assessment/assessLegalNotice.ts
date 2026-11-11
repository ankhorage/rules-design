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

/*** Applies configured legal-notice policy to independently observed link facts. */
export function assessLegalNotice(
  facts: readonly AssessmentFact[],
  options: WebsiteAssessmentRuleOptions,
): AssessmentResult {
  const observations = validatedWebsiteAssessmentValues(
    facts.map((fact) => legalNoticeObservation(fact.value, fact.id)),
  );
  if (options.legalNoticePolicy === undefined || observations === null)
    return websiteAssessmentResult(null);
  return options.legalNoticePolicy === 'not-required'
    ? websiteAssessmentResult([])
    : websiteAssessmentResult(
        observations.flatMap((observation) =>
          observation.global && observation.reachable && observation.content === 'substantive'
            ? []
            : [legalNoticeFinding(observation)],
        ),
      );
}

interface LegalNoticeObservation {
  readonly content: 'empty' | 'misleading' | 'substantive';
  readonly global: boolean;
  readonly id: string;
  readonly reachable: boolean;
  readonly subject: RuleSubject;
}

/*** Parses legal notice facts without promoting labels to legal conclusions. */
function legalNoticeObservation(
  value: Readonly<Record<string, JsonValue>>,
  id: string,
): LegalNoticeObservation | null {
  const subject = websiteAssessmentValues.subject(value.subject);
  return value.version === 1 &&
    isStringArray(value.labels) &&
    typeof value.global === 'boolean' &&
    typeof value.reachable === 'boolean' &&
    (value.content === 'substantive' ||
      value.content === 'empty' ||
      value.content === 'misleading') &&
    subject !== null
    ? { content: value.content, global: value.global, id, reachable: value.reachable, subject }
    : null;
}

/*** Creates a normalized legal notice failure without retaining page text. */
function legalNoticeFinding(observation: LegalNoticeObservation): AssessmentFinding {
  return {
    evidence: {
      issue: !observation.reachable
        ? 'unreachable'
        : !observation.global
          ? 'not-site-wide'
          : 'empty-or-misleading',
      noticeId: observation.id,
    },
    message: 'A configured legal notice is not site-wide, reachable, and substantive.',
    subject: observation.subject,
  };
}
