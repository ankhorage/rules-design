import type { AssessmentDefinition } from '../../types/websiteAssessment';
import { assessContactAddressMarkup } from './assessContactAddressMarkup';
import { assessCopyrightNotice } from './assessCopyrightNotice';
import { assessDuplicateMediaUse } from './assessDuplicateMediaUse';
import { assessLegalNotice } from './assessLegalNotice';
import { assessPrivacyNotice } from './assessPrivacyNotice';
import { assessTrackingConsent } from './assessTrackingConsent';

/*** Declares the fixed website-assessment catalog without allowing host verdicts as facts. */
export const websiteAssessmentDefinitions: readonly AssessmentDefinition[] = [
  definition(
    'design.contact.address-markup',
    'website.contact-observation',
    'warning',
    'Recognized contact addresses use semantic markup and valid contact links.',
    assessContactAddressMarkup,
  ),
  definition(
    'design.website.copyright-notice',
    'website.copyright-observation',
    'warning',
    'Recognized copyright notices are available from site-wide footer evidence.',
    assessCopyrightNotice,
  ),
  definition(
    'design.website.legal-notice',
    'website.legal-notice-observation',
    'warning',
    'Configured legal notices are discoverable, reachable, and sufficiently identified.',
    assessLegalNotice,
  ),
  definition(
    'design.website.privacy-notice',
    'website.privacy-notice-observation',
    'warning',
    'Configured privacy notices are reachable and consistent with observed processing.',
    assessPrivacyNotice,
  ),
  definition(
    'design.website.tracking-consent',
    'website.tracking-observation',
    'error',
    'Observed optional tracking follows the configured jurisdiction consent policy.',
    assessTrackingConsent,
  ),
  definition(
    'design.media.duplicate-use',
    'website.media-inventory',
    'warning',
    'Repeated image assets are classified without treating intentional reuse as a defect.',
    assessDuplicateMediaUse,
  ),
];

/*** Creates one immutable definition with its capability-owned evaluator. */
function definition(
  id: AssessmentDefinition['id'],
  factKind: string,
  severity: AssessmentDefinition['severity'],
  summary: string,
  evaluate: AssessmentDefinition['evaluate'],
): AssessmentDefinition {
  return {
    capability: factKind,
    evaluate,
    factKind,
    id,
    severity,
    summary,
  };
}
