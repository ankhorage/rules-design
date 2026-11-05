import type { FactEnvelope, Scope } from '@ankhorage/contracts/rules';
import { evaluateRules, type JsonValue, type Rule } from '@ankhorage/rules';
import { expect, test } from 'bun:test';

import { createMediaRuleSet } from './createMediaRuleSet.ts';
import { evaluateMediaAssessment } from './evaluateMediaAssessment.ts';
import { mediaRuleDefinitions } from './mediaRuleDefinitions.ts';

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
    fail: {
      focalPointX: 0.8,
      focalPointY: 0.5,
      mediaId: 'hero-image',
      visibleBottom: 1,
      visibleLeft: 0,
      visibleRight: 0.6,
      visibleTop: 0,
    },
    id: 'design.media.focal-point',
    pass: {
      focalPointX: 0.5,
      focalPointY: 0.5,
      mediaId: 'hero-image',
      visibleBottom: 0.8,
      visibleLeft: 0.2,
      visibleRight: 0.8,
      visibleTop: 0.2,
    },
  },
  {
    fail: {
      devicePixelRatio: 2,
      mediaId: 'hero-image',
      renderedWidth: 400,
      selectedSourceWidth: 480,
      sourceWidths: [480, 800],
    },
    id: 'design.media.responsive-sources',
    pass: {
      devicePixelRatio: 2,
      mediaId: 'hero-image',
      renderedWidth: 400,
      selectedSourceWidth: 800,
      sourceWidths: [480, 800, 1200],
    },
  },
  {
    fail: { mediaId: 'hero-image', overlayContrastRatio: 3 },
    id: 'design.media.overlay-legibility',
    pass: { mediaId: 'hero-image', overlayContrastRatio: 4.5 },
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

test('uses the configured aspect-ratio tolerance instead of an adapter-supplied threshold', () => {
  const fact = mediaFact({
    actualAspectRatio: 1.48,
    expectedAspectRatio: 1.5,
    mediaId: 'hero-image',
    tolerance: 1,
  });
  const defaultRule = mediaRule('design.media.aspect-ratio');
  const tolerantRule = mediaRule('design.media.aspect-ratio', { aspectRatioTolerance: 0.02 });

  expect(evaluate(defaultRule, fact).status).toBe('FAIL');
  expect(evaluate(tolerantRule, fact).status).toBe('PASS');
});

test('owns the overlay contrast threshold instead of accepting one from factual evidence', () => {
  const rule = mediaRule('design.media.overlay-legibility');
  const result = evaluate(
    rule,
    mediaFact({ mediaId: 'hero-image', minimumOverlayContrastRatio: 1, overlayContrastRatio: 3 }),
  );

  expect(result.status).toBe('FAIL');
  expect(result.findings[0]).toMatchObject({ evidence: { expected: 4.5 } });
});

test('derives a skipped media assessment only from its validated rule-specific characteristic', () => {
  const rule = mediaRule('design.media.focal-point');
  const definition = mediaRuleDefinitions.find((candidate) => candidate.id === rule.identity.id);
  if (definition === undefined) throw new Error('Expected focal-point definition.');
  const nonApplicable = {
    id: 'decorative-divider',
    value: { hasFocalPoint: false, mediaId: 'decorative-divider' },
  };
  const missingMeasurement = {
    id: 'hero-image',
    value: { hasFocalPoint: true, mediaId: 'hero-image' },
  };
  const violation = {
    id: 'hero-image',
    value: {
      focalPointX: 0.8,
      focalPointY: 0.5,
      hasFocalPoint: true,
      mediaId: 'hero-image',
      visibleBottom: 1,
      visibleLeft: 0,
      visibleRight: 0.6,
      visibleTop: 0,
    },
  };

  expect(evaluateMediaAssessment(definition, 0, nonApplicable)?.status).toBe('SKIPPED');
  expect(evaluateMediaAssessment(definition, 0, missingMeasurement)).toBeNull();
  expect(evaluateMediaAssessment(definition, 0, violation)?.status).toBe('FAIL');
  expect(
    evaluate(rule, mediaFact({ applicable: false, mediaId: 'decorative-divider' })).status,
  ).toBe('INCOMPLETE');
});

test('reports a failing applicable medium when another medium is proven non-applicable', () => {
  const rule = mediaRule('design.media.focal-point');
  const [result] = evaluateRules(
    {
      facts: [
        mediaFact({ hasFocalPoint: false, mediaId: 'decorative-divider' }),
        mediaFact({
          focalPointX: 0.8,
          focalPointY: 0.5,
          hasFocalPoint: true,
          mediaId: 'hero-image',
          visibleBottom: 1,
          visibleLeft: 0,
          visibleRight: 0.6,
          visibleTop: 0,
        }),
      ],
    },
    [rule],
    { capabilities: ['media.metadata'], scope: { id: scope.id, kind: scope.kind } },
  ).results;

  expect(result).toMatchObject({ status: 'FAIL' });
  expect(result.findings).toEqual([
    expect.objectContaining({ subjects: [{ id: 'hero-image', kind: 'media' }] }),
  ]);
});

test('does not let an adapter supplied applicability flag bypass required media measurements', () => {
  const rule = mediaRule('design.media.focal-point');
  const nonApplicableFailure = mediaFact({
    applicable: false,
    focalPointX: 0.8,
    focalPointY: 0.5,
    mediaId: 'decorative-divider',
    visibleBottom: 1,
    visibleLeft: 0,
    visibleRight: 0.6,
    visibleTop: 0,
  });
  expect(evaluate(rule, nonApplicableFailure).status).toBe('FAIL');
});

test('marks a contradictory characteristic with malformed measurements incomplete instead of skipping', () => {
  const rule = mediaRule('design.media.focal-point');
  const result = evaluate(
    rule,
    mediaFact({ hasFocalPoint: false, mediaId: 'hero-image', visibleLeft: 0 }),
  );

  expect(result.status).toBe('INCOMPLETE');
});

test('reports a failing media item when another scoped media item passes', () => {
  const rule = mediaRule('design.media.aspect-ratio');
  const [result] = evaluateRules(
    {
      facts: [
        mediaFact({ actualAspectRatio: 1.5, expectedAspectRatio: 1.5, mediaId: 'hero-image' }),
        mediaFact({ actualAspectRatio: 1, expectedAspectRatio: 1.5, mediaId: 'card-image' }),
      ],
    },
    [rule],
    {
      capabilities: ['media.metadata'],
      scope: { id: scope.id, kind: scope.kind },
    },
  ).results;

  expect(result).toMatchObject({ status: 'FAIL' });
  expect(result.findings).toEqual([
    expect.objectContaining({ subjects: [{ id: 'card-image', kind: 'media' }] }),
  ]);
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

function mediaRule(
  id: string,
  options: Parameters<typeof createMediaRuleSet>[0] = {},
): Rule<{ readonly facts: readonly FactEnvelope[] }> {
  const rule = createMediaRuleSet(options).rules.find((candidate) => candidate.identity.id === id);
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
