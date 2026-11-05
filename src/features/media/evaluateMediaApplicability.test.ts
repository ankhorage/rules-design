import { expect, test } from 'bun:test';

import { evaluateMediaAssessment } from './evaluateMediaAssessment.ts';
import { mediaRuleDefinitions } from './mediaRuleDefinitions.ts';

const contradictoryMeasurements = [
  {
    id: 'design.media.focal-point',
    value: {
      focalPointX: 0.8,
      focalPointY: 0.5,
      hasFocalPoint: false,
      mediaId: 'hero-image',
      visibleBottom: 1,
      visibleLeft: 0,
      visibleRight: 0.6,
      visibleTop: 0,
    },
  },
  {
    id: 'design.media.responsive-sources',
    value: {
      devicePixelRatio: 2,
      hasResponsiveSources: false,
      mediaId: 'hero-image',
      renderedWidth: 400,
      selectedSourceWidth: 480,
      sourceWidths: [480, 800],
    },
  },
  {
    id: 'design.media.overlay-legibility',
    value: { hasTextOverlay: false, mediaId: 'hero-image', overlayContrastRatio: 3 },
  },
  {
    id: 'design.media.icon-sizing',
    value: {
      actualIconSize: 20,
      expectedIconSize: 24,
      mediaId: 'hero-image',
      mediaKind: 'image',
    },
  },
] as const;

test('evaluates contradictory rule-specific characteristics instead of skipping failing measurements', () => {
  for (const { id, value } of contradictoryMeasurements) {
    const definition = mediaRuleDefinitions.find((candidate) => candidate.id === id);
    if (definition === undefined) throw new Error(`Expected ${id} definition.`);

    expect(evaluateMediaAssessment(definition, 0, { id: value.mediaId, value })?.status).toBe(
      'FAIL',
    );
  }
});
