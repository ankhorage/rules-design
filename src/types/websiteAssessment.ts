import type { FactEnvelope } from '@ankhorage/contracts/rules';
import type { JsonValue, RuleSubject } from '@ankhorage/rules';

/*** Configures explicit policies for the independently composable website assessment RuleSet. */
export interface WebsiteAssessmentRuleOptions {
  readonly legalNoticePolicy?: 'not-required' | 'required';
  readonly privacyNoticePolicy?: 'not-required' | 'required';
  readonly referenceYear?: number;
  readonly trackingConsentPolicy?: 'ch-information-and-objection' | 'eu-eea-prior-consent';
}

type WebsiteAssessmentRuleId =
  | 'design.contact.address-markup'
  | 'design.website.copyright-notice'
  | 'design.website.legal-notice'
  | 'design.website.privacy-notice'
  | 'design.website.tracking-consent'
  | 'design.media.duplicate-use';
export interface WebsiteAssessmentContext {
  readonly facts: readonly FactEnvelope[];
}
export interface AssessmentFact {
  readonly id: string;
  readonly value: Readonly<Record<string, JsonValue>>;
}
export interface AssessmentFinding {
  readonly evidence: Readonly<Record<string, JsonValue>>;
  readonly message: string;
  readonly subject: RuleSubject;
}
export interface AssessmentResult {
  readonly findings: readonly AssessmentFinding[];
  readonly status: 'FAIL' | 'INCOMPLETE' | 'PASS';
}
export interface AssessmentDefinition {
  readonly capability: string;
  readonly factKind: string;
  readonly id: WebsiteAssessmentRuleId;
  readonly severity: 'error' | 'warning';
  readonly summary: string;
  readonly evaluate: (
    facts: readonly AssessmentFact[],
    options: WebsiteAssessmentRuleOptions,
  ) => AssessmentResult;
}
