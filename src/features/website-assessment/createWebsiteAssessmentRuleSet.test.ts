import { expect, test } from 'bun:test';

import { evaluateWebsiteAssessment, websiteAssessmentFact } from './websiteAssessmentTestSupport';

test.each([
  [
    'design.contact.address-markup',
    'website.contact-observation',
    {
      version: 1,
      addressKind: 'company',
      addressContext: 'address',
      contactLinks: [{ kind: 'phone', match: true }],
      subject: { id: 'contact', kind: 'address' },
    },
    {
      version: 1,
      addressKind: 'company',
      addressContext: 'other',
      contactLinks: [{ kind: 'phone', match: false }],
      subject: { id: 'contact', kind: 'address' },
    },
  ],
  [
    'design.website.copyright-notice',
    'website.copyright-observation',
    {
      version: 1,
      noticeSyntax: 'recognized',
      siteRole: 'footer',
      endYear: 2026,
      exception: false,
      subject: { id: 'footer', kind: 'footer' },
    },
    {
      version: 1,
      noticeSyntax: 'recognized',
      siteRole: 'footer',
      endYear: 2024,
      exception: false,
      subject: { id: 'footer', kind: 'footer' },
    },
  ],
  [
    'design.website.legal-notice',
    'website.legal-notice-observation',
    {
      version: 1,
      labels: ['Impressum', 'Legal Notice', 'Mentions légales', 'Note legali'],
      global: true,
      reachable: true,
      content: 'substantive',
      subject: { id: 'legal', kind: 'link' },
    },
    {
      version: 1,
      labels: ['Legal Notice'],
      global: true,
      reachable: false,
      content: 'empty',
      subject: { id: 'legal', kind: 'link' },
    },
  ],
  [
    'design.website.privacy-notice',
    'website.privacy-notice-observation',
    {
      version: 1,
      global: true,
      reachable: true,
      declaredPurposes: ['analytics', 'contact'],
      observedPurposes: ['analytics'],
      subject: { id: 'privacy', kind: 'link' },
    },
    {
      version: 1,
      global: true,
      reachable: true,
      declaredPurposes: ['contact'],
      observedPurposes: ['analytics'],
      subject: { id: 'privacy', kind: 'link' },
    },
  ],
  [
    'design.website.tracking-consent',
    'website.tracking-observation',
    {
      version: 1,
      classification: 'optional',
      states: [
        { state: 'before-choice', optionalTrackingObserved: false, covered: true },
        { state: 'rejected', optionalTrackingObserved: false, covered: true },
        { state: 'accepted', optionalTrackingObserved: true, covered: true },
      ],
      subject: { id: 'consent', kind: 'dialog' },
    },
    {
      version: 1,
      classification: 'optional',
      states: [
        { state: 'before-choice', optionalTrackingObserved: true, covered: true },
        { state: 'rejected', optionalTrackingObserved: true, covered: true },
        { state: 'accepted', optionalTrackingObserved: true, covered: true },
      ],
      subject: { id: 'consent', kind: 'dialog' },
    },
  ],
  [
    'design.media.duplicate-use',
    'website.media-inventory',
    {
      version: 1,
      uses: [
        {
          pageId: 'one',
          componentId: 'hero',
          assetId: 'a',
          role: 'editorial',
          subject: { id: 'one-hero', kind: 'image' },
        },
        {
          pageId: 'two',
          componentId: 'footer',
          assetId: 'logo',
          role: 'system',
          subject: { id: 'two-logo', kind: 'image' },
        },
      ],
    },
    {
      version: 1,
      uses: [
        {
          pageId: 'one',
          componentId: 'hero',
          contentHash: 'sha256:asset',
          role: 'editorial',
          subject: { id: 'one-hero', kind: 'image' },
        },
        {
          pageId: 'two',
          componentId: 'card',
          contentHash: 'sha256:asset',
          role: 'editorial',
          subject: { id: 'two-card', kind: 'image' },
        },
      ],
    },
  ],
] as const)(
  '%s derives pass and fail from structured observations',
  (ruleId, kind, passing, failing) => {
    expect(evaluateWebsiteAssessment(ruleId, [websiteAssessmentFact(kind, passing)]).status).toBe(
      'PASS',
    );
    expect(evaluateWebsiteAssessment(ruleId, [websiteAssessmentFact(kind, failing)]).status).toBe(
      'FAIL',
    );
  },
);

test('redacts raw contact, cookie, and token data from findings', () => {
  const result = evaluateWebsiteAssessment('design.contact.address-markup', [
    websiteAssessmentFact('website.contact-observation', {
      version: 1,
      addressKind: 'company',
      addressContext: 'other',
      contactLinks: [{ kind: 'email', match: false }],
      subject: { id: 'contact', kind: 'address' },
      rawAddress: 'Bahnhofstrasse 12, CH-8623 Wetzikon',
      rawEmail: 'private@example.test',
      rawPhone: '+41 44 000 00 00',
      cookie: 'secret',
      token: 'secret',
    }),
  ]);
  expect(result.status).toBe('FAIL');
  expect(JSON.stringify(result.findings)).not.toContain('Bahnhofstrasse');
  expect(JSON.stringify(result.findings)).not.toContain('private@example');
  expect(JSON.stringify(result.findings)).not.toContain('secret');
});
