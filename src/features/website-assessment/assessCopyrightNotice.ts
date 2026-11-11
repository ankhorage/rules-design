import type { JsonValue, RuleSubject } from '@ankhorage/rules';

import type {
  AssessmentFact,
  AssessmentFinding,
  AssessmentResult,
  WebsiteAssessmentRuleOptions,
} from '../../types/websiteAssessment';
import { validatedWebsiteAssessmentValues } from './isWebsiteAssessmentNonNull';
import { websiteAssessmentResult } from './websiteAssessmentResult';
import { websiteAssessmentValues } from './websiteAssessmentValues';

/*** Assesses parser-normalized copyright placement and year semantics. */
export function assessCopyrightNotice(
  facts: readonly AssessmentFact[],
  options: WebsiteAssessmentRuleOptions,
): AssessmentResult {
  const { referenceYear } = options;
  const observations = validatedWebsiteAssessmentValues(
    facts.map((fact) => copyrightObservation(fact.value, fact.id)),
  );
  return referenceYear === undefined || observations === null
    ? websiteAssessmentResult(null)
    : websiteAssessmentResult(
        observations.flatMap((observation) =>
          observation.year < referenceYear && !observation.exception
            ? [copyrightFinding(observation)]
            : [],
        ),
      );
}

interface CopyrightObservation {
  readonly exception: boolean;
  readonly id: string;
  readonly subject: RuleSubject;
  readonly year: number;
}

/*** Parses public parser output required for copyright assessment. */
function copyrightObservation(
  value: Readonly<Record<string, JsonValue>>,
  id: string,
): CopyrightObservation | null {
  const subject = websiteAssessmentValues.subject(value.subject);
  return value.version === 1 &&
    value.noticeSyntax === 'recognized' &&
    value.siteRole === 'footer' &&
    websiteAssessmentValues.year(value.endYear) &&
    typeof value.exception === 'boolean' &&
    subject !== null
    ? { exception: value.exception, id, subject, year: value.endYear }
    : null;
}

/*** Creates minimal year-only evidence for a stale copyright notice. */
function copyrightFinding(observation: CopyrightObservation): AssessmentFinding {
  return {
    evidence: { issue: 'stale-year', noticeId: observation.id, year: observation.year },
    message: 'A recognized copyright notice has a stale year.',
    subject: observation.subject,
  };
}
