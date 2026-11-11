import { expect, test } from 'bun:test';

import { evaluateWebsiteAssessment, websiteAssessmentFact } from './websiteAssessmentTestSupport';

test('marks unknown enums and incomplete runtime coverage incomplete', () => {
  expect(
    evaluateWebsiteAssessment('design.website.privacy-notice', [
      websiteAssessmentFact('website.privacy-notice-observation', {
        version: 1,
        global: true,
        reachable: true,
        declaredPurposes: ['invented'],
        observedPurposes: [],
        subject: { id: 'privacy', kind: 'link' },
      }),
    ]).status,
  ).toBe('INCOMPLETE');
  expect(
    evaluateWebsiteAssessment('design.website.tracking-consent', [
      websiteAssessmentFact('website.tracking-observation', {
        version: 1,
        classification: 'optional',
        states: [{ state: 'rejected', optionalTrackingObserved: false, covered: false }],
        subject: { id: 'consent', kind: 'dialog' },
      }),
    ]).status,
  ).toBe('INCOMPLETE');
});

test('marks empty or invalid contact-link arrays incomplete', () => {
  expect(
    evaluateWebsiteAssessment('design.contact.address-markup', [
      websiteAssessmentFact('website.contact-observation', {
        version: 1,
        addressKind: 'company',
        addressContext: 'address',
        contactLinks: [],
        subject: { id: 'contact', kind: 'address' },
      }),
    ]).status,
  ).toBe('INCOMPLETE');
  expect(
    evaluateWebsiteAssessment('design.contact.address-markup', [
      websiteAssessmentFact('website.contact-observation', {
        version: 1,
        addressKind: 'company',
        addressContext: 'address',
        contactLinks: [{ kind: 'email' }],
        subject: { id: 'contact', kind: 'address' },
      }),
    ]).status,
  ).toBe('INCOMPLETE');
});

test('marks missing consent states and empty legal labels incomplete', () => {
  expect(
    evaluateWebsiteAssessment('design.website.tracking-consent', [
      websiteAssessmentFact('website.tracking-observation', {
        version: 1,
        classification: 'optional',
        states: [{ state: 'rejected', optionalTrackingObserved: false, covered: true }],
        subject: { id: 'consent', kind: 'dialog' },
      }),
    ]).status,
  ).toBe('INCOMPLETE');
  expect(
    evaluateWebsiteAssessment('design.website.legal-notice', [
      websiteAssessmentFact('website.legal-notice-observation', {
        version: 1,
        labels: [],
        global: true,
        reachable: true,
        content: 'substantive',
        subject: { id: 'legal', kind: 'link' },
      }),
    ]).status,
  ).toBe('INCOMPLETE');
});

test('marks a missing policy and unknown image identity incomplete', () => {
  expect(
    evaluateWebsiteAssessment(
      'design.website.legal-notice',
      [
        websiteAssessmentFact('website.legal-notice-observation', {
          version: 1,
          labels: ['Legal Notice'],
          global: true,
          reachable: true,
          content: 'substantive',
          subject: { id: 'legal', kind: 'link' },
        }),
      ],
      { legalNoticePolicy: undefined },
    ).status,
  ).toBe('INCOMPLETE');
  expect(
    evaluateWebsiteAssessment('design.media.duplicate-use', [
      websiteAssessmentFact('website.media-inventory', {
        version: 1,
        uses: [
          {
            pageId: 'one',
            componentId: 'hero',
            role: 'editorial',
            subject: { id: 'hero', kind: 'image' },
          },
        ],
      }),
    ]).status,
  ).toBe('INCOMPLETE');
});

test('is deterministic across fact order and exempts system logos', () => {
  const inventory = websiteAssessmentFact('website.media-inventory', {
    version: 1,
    uses: [
      {
        pageId: 'a',
        componentId: 'hero',
        lineageId: 'photo',
        role: 'editorial',
        subject: { id: 'a', kind: 'image' },
      },
      {
        pageId: 'b',
        componentId: 'card',
        lineageId: 'photo',
        role: 'editorial',
        subject: { id: 'b', kind: 'image' },
      },
      {
        pageId: 'a',
        componentId: 'header',
        assetId: 'logo',
        role: 'system',
        subject: { id: 'logo-a', kind: 'image' },
      },
      {
        pageId: 'b',
        componentId: 'header',
        assetId: 'logo',
        role: 'system',
        subject: { id: 'logo-b', kind: 'image' },
      },
    ],
  });
  const unrelated = websiteAssessmentFact('website.media-inventory', {
    version: 1,
    uses: [
      {
        pageId: 'c',
        componentId: 'card',
        assetId: 'other',
        role: 'editorial',
        subject: { id: 'c', kind: 'image' },
      },
    ],
  });
  expect(evaluateWebsiteAssessment('design.media.duplicate-use', [inventory, unrelated])).toEqual(
    evaluateWebsiteAssessment('design.media.duplicate-use', [unrelated, inventory]),
  );
});
