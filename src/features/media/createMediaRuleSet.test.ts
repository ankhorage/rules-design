import type { FactEnvelope, Scope } from '@ankhorage/contracts/rules';
import { evaluateRules, type JsonValue, type Rule } from '@ankhorage/rules';
import { expect, test } from 'bun:test';

import { createMediaRuleSet } from './createMediaRuleSet.ts';

const scope: Scope = {
  id: 'hero',
  kind: 'component',
  target: { kind: 'page', projectId: 'project', targetId: 'home', tenantId: 'tenant' },
};

const mediaCases: readonly {
  readonly fail: Readonly<Record<string, JsonValue>>;
  readonly id: string;
  readonly pass: Readonly<Record<string, JsonValue>>;
}[] = [
  {
    fail: { actualAspectRatio: 1, expectedAspectRatio: 1.5, mediaId: 'hero-image' },
    id: 'design.media.aspect-ratio',
    pass: { actualAspectRatio: 1.5, expectedAspectRatio: 1.5, mediaId: 'hero-image' },
  },
  {
    fail: { intrinsicHeight: 0, intrinsicWidth: 1920, mediaId: 'hero-image' },
    id: 'design.media.intrinsic-size',
    pass: { intrinsicHeight: 1080, intrinsicWidth: 1920, mediaId: 'hero-image' },
  },
  {
    fail: {
      intrinsicHeight: 300,
      intrinsicWidth: 400,
      mediaId: 'hero-image',
      renderedHeight: 600,
      renderedWidth: 800,
    },
    id: 'design.media.resolution-fit',
    pass: {
      intrinsicHeight: 1200,
      intrinsicWidth: 1600,
      mediaId: 'hero-image',
      renderedHeight: 600,
      renderedWidth: 800,
    },
  },
  {
    fail: { actualObjectFit: 'contain', expectedObjectFit: 'cover', mediaId: 'hero-image' },
    id: 'design.media.object-fit',
    pass: { actualObjectFit: 'cover', expectedObjectFit: 'cover', mediaId: 'hero-image' },
  },
  {
    fail: { focalPointPreserved: false, mediaId: 'hero-image' },
    id: 'design.media.focal-point',
    pass: { focalPointPreserved: true, mediaId: 'hero-image' },
  },
  {
    fail: { hasResponsiveSource: false, mediaId: 'hero-image' },
    id: 'design.media.responsive-sources',
    pass: { hasResponsiveSource: true, mediaId: 'hero-image' },
  },
  {
    fail: { mediaId: 'hero-image', minimumOverlayContrastRatio: 4.5, overlayContrastRatio: 3 },
    id: 'design.media.overlay-legibility',
    pass: { mediaId: 'hero-image', minimumOverlayContrastRatio: 4.5, overlayContrastRatio: 4.5 },
  },
  {
    fail: { actualIconSize: 20, expectedIconSize: 24, mediaId: 'menu-icon' },
    id: 'design.media.icon-sizing',
    pass: { actualIconSize: 24, expectedIconSize: 24, mediaId: 'menu-icon' },
  },
  {
    fail: { accessibleName: null, classification: 'content', mediaId: 'hero-image' },
    id: 'design.media.decorative-vs-content',
    pass: { accessibleName: 'Team at work', classification: 'content', mediaId: 'hero-image' },
  },
];

for (const mediaCase of mediaCases) {
  test(`${mediaCase.id} passes, fails, and remains incomplete without its measurement`, () => {
    const rule = mediaRule(mediaCase.id);
    expect(evaluate(rule, mediaFact(mediaCase.pass)).status).toBe('PASS');
    expect(evaluate(rule, mediaFact(mediaCase.fail)).status).toBe('FAIL');
    expect(evaluate(rule, mediaFact({ mediaId: 'hero-image' })).status).toBe('INCOMPLETE');
  });
}

test('never passes an explicitly missing media measurement', () => {
  const rule = mediaRule('design.media.overlay-legibility');
  const missingFact: FactEnvelope = {
    contentHash: 'missing-overlay-contrast',
    id: 'hero-image',
    kind: 'design.media.assessment',
    missing: { code: 'not-measured', message: 'The browser did not provide overlay contrast.' },
    provenance: provenance,
    schemaVersion: 1,
    scope,
    status: 'missing',
  };

  const result = evaluate(rule, missingFact);
  expect(result.status).toBe('INCOMPLETE');
  expect(result.findings[0]?.message).toContain('explicitly unavailable');
});

test('declares the frozen catalog IDs and media capability without central registration', () => {
  const ruleSet = createMediaRuleSet();
  expect(ruleSet.id).toBe('ankhorage.rules-design.media');
  expect(ruleSet.rules.map((rule) => rule.identity.id)).toEqual(
    mediaCases.map((mediaCase) => mediaCase.id),
  );
  expect(ruleSet.rules.every((rule) => rule.requiredCapabilities?.[0] === 'media.metadata')).toBe(
    true,
  );
});

const provenance = {
  collectedAt: '2026-11-05T00:00:00.000Z',
  producer: { id: 'fixture', version: '1.0.0' },
  source: { id: 'fixture-page', revision: '1' },
} as const;

function mediaRule(id: string): Rule<{ readonly facts: readonly FactEnvelope[] }> {
  const rule = createMediaRuleSet().rules.find((candidate) => candidate.identity.id === id);
  if (rule === undefined) throw new Error(`Missing media rule ${id}.`);
  return rule;
}

function evaluate(rule: Rule<{ readonly facts: readonly FactEnvelope[] }>, fact: FactEnvelope) {
  const [result] = evaluateRules({ facts: [fact] }, [rule], {
    capabilities: ['media.metadata'],
    scope: { id: scope.id, kind: scope.kind },
  }).results;
  return result;
}

function mediaFact(value: Readonly<Record<string, JsonValue>>): FactEnvelope {
  const { mediaId } = value;
  if (typeof mediaId !== 'string') throw new Error('Media facts require a string mediaId.');
  return {
    contentHash: `media-${mediaId}`,
    id: mediaId,
    kind: 'design.media.assessment',
    provenance,
    schemaVersion: 1,
    scope,
    status: 'available',
    value,
  };
}
