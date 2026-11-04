import type { FactEnvelope } from '@ankhorage/contracts/rules';

type AvailableFact = Extract<FactEnvelope, { readonly status: 'available' }>;

/*** Creates one available frozen fact envelope for deterministic Responsive rule tests. */
function responsiveFact(value: AvailableFact['value']): AvailableFact {
  return {
    contentHash: 'responsive-fact-hash',
    id: 'responsive-viewport-matrix',
    kind: 'design.responsive.viewport-matrix',
    provenance: {
      collectedAt: '2026-11-05T00:00:00.000Z',
      producer: { id: 'fixture', version: '1' },
      source: { id: 'fixture-page', revision: '1' },
    },
    schemaVersion: 1,
    scope: {
      id: 'page:/fixture',
      kind: 'page',
      target: { kind: 'page', projectId: 'fixture', targetId: 'fixture-page', tenantId: 'fixture' },
    },
    status: 'available',
    value,
  };
}

/*** Provides complete representative viewport facts for responsive rule tests. */
export function completeResponsiveFact(): AvailableFact {
  return responsiveFact({
    minimumTouchTarget: 24,
    requiredBreakpointIds: ['mobile', 'desktop'],
    requiredOrientations: ['portrait', 'landscape'],
    viewports: [viewport('mobile', 'portrait', 1), viewport('desktop', 'landscape', 2)],
  });
}

/*** Provides one viewport matrix that fails every measurable Responsive policy. */
export function failingResponsiveFact(): AvailableFact {
  return responsiveFact({
    minimumTouchTarget: 24,
    requiredBreakpointIds: ['mobile', 'tablet', 'desktop'],
    requiredOrientations: ['portrait', 'landscape'],
    viewports: [
      {
        elements: [
          {
            ...element('title', 'text'),
            bounds: { height: 20, width: 20 },
            hasProblematicFixedDimensions: true,
            textWrapsMeaningfully: false,
            visualOrder: 2,
          },
          { ...element('continue', 'control'), bounds: { height: 20, width: 20 } },
          { ...element('hero', 'image'), focalPointVisible: false },
        ],
        id: 'mobile',
        layout: {
          horizontalOverflow: true,
          orientationRobust: false,
          reflowed: false,
          zoomReflowed: false,
        },
        orientation: 'portrait',
        zoom: 2,
      },
    ],
  });
}

/*** Creates one normalized viewport entry with explicit browser/DOM measurements. */
function viewport(id: string, orientation: 'landscape' | 'portrait', zoom: number) {
  return {
    elements: [element('title', 'text'), element('continue', 'control'), element('hero', 'image')],
    id,
    layout: {
      horizontalOverflow: false,
      orientationRobust: true,
      reflowed: true,
      zoomReflowed: true,
    },
    orientation,
    zoom,
  };
}

/*** Creates one fully measured responsive element. */
function element(id: string, kind: 'control' | 'image' | 'text') {
  return {
    bounds: { height: 24, width: 24 },
    focalPointVisible: kind === 'image' ? true : null,
    hasProblematicFixedDimensions: false,
    id,
    kind,
    readingOrder: kind === 'text' ? 1 : null,
    textWrapsMeaningfully: kind === 'text' ? true : null,
    visualOrder: kind === 'text' ? 1 : null,
  };
}
