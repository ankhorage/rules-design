import type { AvailableFactEnvelope } from '@ankhorage/contracts/rules';
import { evaluateRules } from '@ankhorage/rules';
import { expect, test } from 'bun:test';

import { createWebsiteAssessmentRuleSet } from './createWebsiteAssessmentRuleSet';

const scope = { id: 'site', kind: 'website' };
const ruleSet = createWebsiteAssessmentRuleSet({
  legalNoticeRequired: true,
  privacyNoticeRequired: true,
});
const cases = [
  [
    'design.contact.address-markup',
    { classification: 'recognized', markupStatus: 'correct', contactLinksStatus: 'valid' },
    { classification: 'recognized', markupStatus: 'incorrect', contactLinksStatus: 'valid' },
  ],
  [
    'design.website.copyright-notice',
    { noticeStatus: 'present', footerStatus: 'site-wide', yearStatus: 'current' },
    { noticeStatus: 'absent', footerStatus: 'missing', yearStatus: 'unknown' },
  ],
  [
    'design.website.legal-notice',
    {
      policyStatus: 'required',
      pageStatus: 'reachable',
      navigationStatus: 'site-wide',
      operatorStatus: 'complete',
    },
    {
      policyStatus: 'required',
      pageStatus: 'absent',
      navigationStatus: 'missing',
      operatorStatus: 'incomplete',
    },
  ],
  [
    'design.website.privacy-notice',
    {
      policyStatus: 'required',
      pageStatus: 'reachable',
      navigationStatus: 'site-wide',
      processingStatus: 'consistent',
    },
    {
      policyStatus: 'required',
      pageStatus: 'reachable',
      navigationStatus: 'site-wide',
      processingStatus: 'contradicted',
    },
  ],
  [
    'design.website.tracking-consent',
    {
      jurisdiction: 'eu-eea',
      runtimeStatus: 'complete',
      trackingStatus: 'optional',
      beforeChoiceStatus: 'blocked',
      rejectStatus: 'blocked',
      choiceStatus: 'effective',
    },
    {
      jurisdiction: 'eu-eea',
      runtimeStatus: 'complete',
      trackingStatus: 'optional',
      beforeChoiceStatus: 'observed',
      rejectStatus: 'observed',
      choiceStatus: 'ineffective',
    },
  ],
  [
    'design.media.duplicate-use',
    { identityStatus: 'verified', reuseStatus: 'intentional' },
    { identityStatus: 'verified', reuseStatus: 'unintended' },
  ],
] as const;

test('evaluates complete pass, fail, and incomplete observations deterministically for every follow-on rule', () => {
  for (const [id, passing, failing] of cases) {
    expect(evaluate(id, passing).status).toBe('PASS');
    expect(evaluate(id, failing).status).toBe('FAIL');
    expect(evaluate(id, { classification: 'ambiguous' }).status).toBe('INCOMPLETE');
    expect(evaluate(id, passing)).toEqual(evaluate(id, passing));
  }
});

test('keeps private contact text and raw cookies out of findings while retaining normalized status evidence', () => {
  const result = evaluate('design.contact.address-markup', {
    classification: 'recognized',
    contactLinksStatus: 'invalid',
    markupStatus: 'incorrect',
    rawAddress: 'Ada Lovelace, Bahnhofstrasse 12, CH-8623 Wetzikon',
  });

  expect(result.status).toBe('FAIL');
  expect(result.findings[0]?.evidence).toEqual({
    classification: 'recognized',
    contactLinksStatus: 'invalid',
    markupStatus: 'incorrect',
  });
});

/*** Evaluates one normalized fact using only the rule's declared capability and active website scope. */
function evaluate(id: string, value: Readonly<Record<string, string>>) {
  const rule = ruleSet.rules.find((candidate) => candidate.identity.id === id);
  if (rule === undefined) throw new Error(`Missing website assessment rule: ${id}`);
  const [result] = evaluateRules({ facts: [fact(id, value)] }, [rule], {
    capabilities: rule.requiredCapabilities,
    scope,
  }).results;
  return result;
}

/*** Constructs a portable host-owned fact without embedding DOM, cookie, or address objects. */
function fact(kind: string, value: Readonly<Record<string, string>>): AvailableFactEnvelope {
  return {
    contentHash: `sha256:${kind}`,
    id: `${kind}:site`,
    kind,
    provenance: {
      collectedAt: '2026-11-11T00:00:00.000Z',
      producer: { id: 'fixture', version: '1' },
      source: { id: 'fixture', revision: null },
    },
    schemaVersion: 1,
    scope: {
      ...scope,
      target: { kind: 'application', projectId: 'project', targetId: 'site', tenantId: 'tenant' },
    },
    status: 'available',
    value,
  };
}
