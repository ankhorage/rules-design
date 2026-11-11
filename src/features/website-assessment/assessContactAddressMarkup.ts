import type { JsonValue, RuleSubject } from '@ankhorage/rules';
import { isRecord } from '@ankhorage/utility/object';

import type {
  AssessmentFact,
  AssessmentFinding,
  AssessmentResult,
} from '../../types/websiteAssessment';
import { validatedWebsiteAssessmentValues } from './isWebsiteAssessmentNonNull';
import { websiteAssessmentResult } from './websiteAssessmentResult';
import { websiteAssessmentValues } from './websiteAssessmentValues';

/*** Assesses semantic contact placement and normalized contact-link matching. */
export function assessContactAddressMarkup(facts: readonly AssessmentFact[]): AssessmentResult {
  const observations = validatedWebsiteAssessmentValues(
    facts.map((fact) => contactObservation(fact.value, fact.id)),
  );
  if (observations === null) return websiteAssessmentResult(null);
  return websiteAssessmentResult(
    observations.flatMap((observation) =>
      observation.context === 'address' && observation.links.every(Boolean)
        ? []
        : [
            contactFinding(
              observation.subject,
              observation.context === 'address' ? 'contact-link' : 'address-context',
              observation.id,
              observation.kind,
            ),
          ],
    ),
  );
}

interface ContactObservation {
  readonly context: 'address' | 'other';
  readonly id: string;
  readonly kind: 'company' | 'person';
  readonly links: readonly boolean[];
  readonly subject: RuleSubject;
}

/*** Parses a contact observation without retaining raw address or link content. */
function contactObservation(
  value: Readonly<Record<string, JsonValue>>,
  id: string,
): ContactObservation | null {
  const subject = websiteAssessmentValues.subject(value.subject);
  if (
    !Array.isArray(value.contactLinks) ||
    subject === null ||
    value.version !== 1 ||
    (value.addressKind !== 'company' && value.addressKind !== 'person') ||
    (value.addressContext !== 'address' && value.addressContext !== 'other')
  )
    return null;
  const links = value.contactLinks.map(contactLinkMatch);
  const matches = validatedWebsiteAssessmentValues(links);
  return links.length === 0 || matches === null
    ? null
    : { context: value.addressContext, id, kind: value.addressKind, links: matches, subject };
}

/*** Validates a single normalized contact-link match without exposing its target. */
function contactLinkMatch(value: JsonValue): boolean | null {
  return isRecord(value) &&
    (value.kind === 'email' || value.kind === 'phone') &&
    typeof value.match === 'boolean'
    ? value.match
    : null;
}

/*** Creates privacy-safe evidence for a contact semantic defect. */
function contactFinding(
  subject: RuleSubject,
  issue: 'address-context' | 'contact-link',
  observationId: string,
  addressKind: 'company' | 'person',
): AssessmentFinding {
  return {
    evidence: { addressKind, issue, observationId },
    message:
      'A recognized contact address lacks semantic address context or a matching contact link.',
    subject,
  };
}
