import type { FactEnvelope } from '@ankhorage/contracts/rules';
import type { Rule, RuleEvaluationOutcome, RuleScope, RuleSet } from '@ankhorage/rules';
import { isRecord } from '@ankhorage/utility/object';

import type { WebsiteAssessmentRuleOptions } from '../../types/websiteAssessment';

interface WebsiteAssessmentContext {
  readonly facts: readonly FactEnvelope[];
}

interface RuleDefinition {
  readonly capability: string;
  readonly id: string;
  readonly severity: 'error' | 'warning';
  readonly summary: string;
  readonly evaluate: (
    observation: Readonly<Record<string, unknown>>,
    options: WebsiteAssessmentRuleOptions,
  ) => 'PASS' | 'FAIL' | 'INCOMPLETE';
}

const definitions: readonly RuleDefinition[] = [
  {
    capability: 'website.contact-observation',
    id: 'design.contact.address-markup',
    severity: 'warning',
    summary: 'Recognized contact addresses use semantic markup and valid contact links.',
    evaluate: addressVerdict,
  },
  {
    capability: 'website.copyright-observation',
    id: 'design.website.copyright-notice',
    severity: 'warning',
    summary: 'Recognized copyright notices are available from site-wide footer evidence.',
    evaluate: copyrightVerdict,
  },
  {
    capability: 'website.legal-notice-observation',
    id: 'design.website.legal-notice',
    severity: 'warning',
    summary: 'Configured legal notices are discoverable, reachable, and sufficiently identified.',
    evaluate: legalVerdict,
  },
  {
    capability: 'website.privacy-notice-observation',
    id: 'design.website.privacy-notice',
    severity: 'warning',
    summary: 'Configured privacy notices are reachable and consistent with observed processing.',
    evaluate: privacyVerdict,
  },
  {
    capability: 'website.tracking-observation',
    id: 'design.website.tracking-consent',
    severity: 'error',
    summary: 'Observed optional tracking follows the configured jurisdiction consent policy.',
    evaluate: trackingVerdict,
  },
  {
    capability: 'website.media-inventory',
    id: 'design.media.duplicate-use',
    severity: 'warning',
    summary: 'Repeated image assets are classified without treating intentional reuse as a defect.',
    evaluate: duplicateVerdict,
  },
];

/*** Creates the separately composable follow-on website and contact assessment rules. */
export function createWebsiteAssessmentRuleSet(
  options: WebsiteAssessmentRuleOptions = {},
): RuleSet<WebsiteAssessmentContext> {
  return {
    id: 'ankhorage.rules-design.website-assessment',
    rules: definitions.map((definition) => createRule(definition, options)),
  };
}

/*** Adapts one fact-driven website observation to the public Rules engine contract. */
function createRule(
  definition: RuleDefinition,
  options: WebsiteAssessmentRuleOptions,
): Rule<WebsiteAssessmentContext> {
  return {
    defaultSeverity: definition.severity,
    dependencies: [],
    evaluate: ({ context, scope }) => evaluateRule(definition, options, context.facts, scope),
    identity: { id: definition.id, version: '1.0.0' },
    requiredCapabilities: [definition.capability],
    summary: definition.summary,
  };
}

/*** Evaluates exactly one complete normalized observation for the active Rules scope. */
function evaluateRule(
  definition: RuleDefinition,
  options: WebsiteAssessmentRuleOptions,
  facts: readonly FactEnvelope[],
  scope: RuleScope,
): RuleEvaluationOutcome {
  const observation = observationFor(facts, definition.id, scope);
  if (observation === null) return incomplete(definition.id, scope.id);
  const status = definition.evaluate(observation, options);
  return status === 'PASS'
    ? { findings: [], status }
    : {
        findings: [
          {
            evidence: safeEvidence(observation),
            message:
              status === 'FAIL'
                ? definition.summary
                : 'The supplied normalized observation is insufficient for a verdict.',
            ruleId: definition.id,
            severity: status === 'FAIL' ? definition.severity : 'info',
            subjects: [{ id: scope.id, kind: scope.kind }],
          },
        ],
        status,
      };
}

/*** Selects one available non-PII observation and fails closed for duplicate or malformed facts. */
function observationFor(
  facts: readonly FactEnvelope[],
  kind: string,
  scope: RuleScope,
): Readonly<Record<string, unknown>> | null {
  const matches = facts.filter(
    (fact) => fact.kind === kind && fact.scope.id === scope.id && fact.scope.kind === scope.kind,
  );
  if (matches.length !== 1 || matches[0]?.status !== 'available') return null;
  const [{ value }] = matches;
  return isRecord(value) ? value : null;
}

/*** Prevents contact, cookie, and source data from escaping the normalized fact boundary. */
function safeEvidence(observation: Readonly<Record<string, unknown>>): Record<string, string> {
  return Object.entries(observation).reduce<Record<string, string>>(
    (evidence, [key, value]) =>
      typeof value === 'string' &&
      (key.endsWith('Status') || key === 'classification' || key === 'jurisdiction')
        ? { ...evidence, [key]: value }
        : evidence,
    {},
  );
}

/*** Assesses parser-normalized contact semantics without parsing or retaining raw address text. */
function addressVerdict(value: Readonly<Record<string, unknown>>): 'PASS' | 'FAIL' | 'INCOMPLETE' {
  if (
    value.classification === 'ambiguous' ||
    value.classification === undefined ||
    value.markupStatus === undefined ||
    value.contactLinksStatus === undefined
  )
    return 'INCOMPLETE';
  return value.classification === 'recognized' &&
    value.markupStatus === 'correct' &&
    value.contactLinksStatus === 'valid'
    ? 'PASS'
    : 'FAIL';
}

/*** Assesses parser-normalized copyright placement and freshness without inferring ownership or generation. */
function copyrightVerdict(
  value: Readonly<Record<string, unknown>>,
): 'PASS' | 'FAIL' | 'INCOMPLETE' {
  if (
    value.noticeStatus === 'ambiguous' ||
    value.noticeStatus === undefined ||
    value.footerStatus === undefined ||
    value.yearStatus === undefined
  )
    return 'INCOMPLETE';
  return value.noticeStatus === 'present' &&
    value.footerStatus === 'site-wide' &&
    (value.yearStatus === 'current' || value.yearStatus === 'historical')
    ? 'PASS'
    : 'FAIL';
}

/*** Applies legal-notice policy only when applicability has been explicitly configured. */
function legalVerdict(
  value: Readonly<Record<string, unknown>>,
  options: WebsiteAssessmentRuleOptions,
): 'PASS' | 'FAIL' | 'INCOMPLETE' {
  if (
    value.policyStatus === undefined ||
    value.pageStatus === undefined ||
    value.navigationStatus === undefined ||
    value.operatorStatus === undefined ||
    value.policyStatus === 'unknown' ||
    value.pageStatus === 'unknown' ||
    value.navigationStatus === 'unknown' ||
    value.operatorStatus === 'unknown'
  )
    return 'INCOMPLETE';
  if (!options.legalNoticeRequired && value.policyStatus !== 'required')
    return value.pageStatus === 'absent' ? 'FAIL' : 'PASS';
  return value.pageStatus === 'reachable' &&
    value.navigationStatus === 'site-wide' &&
    value.operatorStatus === 'complete'
    ? 'PASS'
    : 'FAIL';
}

/*** Requires observed processing evidence before declaring a privacy statement internally consistent. */
function privacyVerdict(
  value: Readonly<Record<string, unknown>>,
  options: WebsiteAssessmentRuleOptions,
): 'PASS' | 'FAIL' | 'INCOMPLETE' {
  if (
    value.policyStatus === undefined ||
    value.pageStatus === undefined ||
    value.navigationStatus === undefined ||
    value.processingStatus === undefined ||
    value.policyStatus === 'unknown' ||
    value.pageStatus === 'unknown' ||
    value.navigationStatus === 'unknown' ||
    value.processingStatus === 'unknown'
  )
    return 'INCOMPLETE';
  if (!options.privacyNoticeRequired && value.policyStatus !== 'required')
    return value.pageStatus === 'absent' ? 'FAIL' : 'PASS';
  return value.pageStatus === 'reachable' &&
    value.navigationStatus === 'site-wide' &&
    value.processingStatus === 'consistent'
    ? 'PASS'
    : 'FAIL';
}

/*** Distinguishes EU prior-consent evidence from the configured Swiss information policy. */
function trackingVerdict(value: Readonly<Record<string, unknown>>): 'PASS' | 'FAIL' | 'INCOMPLETE' {
  if (
    value.jurisdiction === undefined ||
    value.jurisdiction === 'unknown' ||
    value.runtimeStatus !== 'complete' ||
    value.trackingStatus === 'unknown'
  )
    return 'INCOMPLETE';
  if (value.trackingStatus === 'essential-only') return 'PASS';
  if (
    value.beforeChoiceStatus === undefined ||
    value.rejectStatus === undefined ||
    value.choiceStatus === undefined
  )
    return 'INCOMPLETE';
  const blocked = value.beforeChoiceStatus === 'blocked' && value.rejectStatus === 'blocked';
  return value.jurisdiction === 'eu-eea'
    ? blocked && value.choiceStatus === 'effective'
      ? 'PASS'
      : 'FAIL'
    : value.choiceStatus === 'effective'
      ? 'PASS'
      : 'FAIL';
}

/*** Reports only qualified asset identity and never treats intentional reuse as a universal failure. */
function duplicateVerdict(
  value: Readonly<Record<string, unknown>>,
): 'PASS' | 'FAIL' | 'INCOMPLETE' {
  if (
    value.identityStatus === undefined ||
    value.reuseStatus === undefined ||
    value.identityStatus === 'unknown'
  )
    return 'INCOMPLETE';
  return value.reuseStatus === 'unintended' ? 'FAIL' : 'PASS';
}

/*** Produces a canonical incomplete outcome when no complete normalized observation exists. */
function incomplete(ruleId: string, scopeId: string): RuleEvaluationOutcome {
  return {
    findings: [
      {
        evidence: { scopeId },
        message: 'A complete normalized website assessment observation is unavailable.',
        ruleId,
        severity: 'info',
        subjects: [{ id: scopeId, kind: 'website' }],
      },
    ],
    status: 'INCOMPLETE',
  };
}
