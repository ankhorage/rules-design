import type { FactEnvelope } from '@ankhorage/contracts/rules';

type AvailableFact = Extract<FactEnvelope, { readonly status: 'available' }>;
type ResponsiveFact = Omit<AvailableFact, 'value'> & { readonly value: ResponsiveFactValue };
type ResponsiveFactValue = {
  readonly minimumTouchTarget: number;
  readonly requiredBreakpointIds: readonly string[];
  readonly requiredOrientations: readonly ('landscape' | 'portrait')[];
  readonly viewports: readonly ResponsiveViewportValue[];
};
type ResponsiveViewportValue = {
  readonly elements: readonly ResponsiveElementValue[];
  readonly id: string;
  readonly layout: { readonly renderedWidth: number; readonly scrollWidth: number };
  readonly orientation: 'landscape' | 'portrait';
  readonly size: ResponsiveDimensionsValue;
  readonly zoom: number;
};
type ResponsiveElementValue = {
  readonly bounds: ResponsiveBoundsValue;
  readonly fixedSize: ResponsiveDimensionsValue | null;
  readonly focalPointBounds: ResponsiveBoundsValue | null;
  readonly id: string;
  readonly kind: 'control' | 'image' | 'text';
  readonly readingOrder: number | null;
  readonly textLineCount: number | null;
  readonly textUnwrappedWidth: number | null;
  readonly visualOrder: number | null;
};
type ResponsiveBoundsValue = ResponsiveDimensionsValue & { readonly x: number; readonly y: number };
type ResponsiveDimensionsValue = { readonly height: number; readonly width: number };

/*** Creates one available frozen fact envelope for deterministic Responsive rule tests. */
function responsiveFact(value: ResponsiveFactValue): ResponsiveFact {
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
export function completeResponsiveFact(): ResponsiveFact {
  return responsiveFact({
    minimumTouchTarget: 24,
    requiredBreakpointIds: ['mobile', 'desktop'],
    requiredOrientations: ['portrait', 'landscape'],
    viewports: [viewport('mobile', 'portrait', 1), viewport('desktop', 'landscape', 2)],
  });
}

/*** Provides one viewport matrix that fails every measurable Responsive policy. */
export function failingResponsiveFact(): ResponsiveFact {
  return responsiveFact({
    minimumTouchTarget: 24,
    requiredBreakpointIds: ['mobile'],
    requiredOrientations: ['portrait', 'landscape'],
    viewports: [
      {
        elements: [
          {
            ...element('title', 'text'),
            bounds: bounds(20, 20),
            fixedSize: dimensions(20, 500),
            textLineCount: 1,
            textUnwrappedWidth: 40,
            visualOrder: 2,
          },
          { ...element('continue', 'control'), bounds: bounds(20, 20) },
          { ...element('hero', 'image'), focalPointBounds: bounds(30, 30) },
        ],
        id: 'mobile',
        layout: { renderedWidth: 500, scrollWidth: 500 },
        orientation: 'portrait',
        size: dimensions(667, 375),
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
    layout: { renderedWidth: 320, scrollWidth: 320 },
    orientation,
    size: dimensions(640, 320),
    zoom,
  };
}

/*** Creates one fully measured responsive element. */
function element(id: string, kind: 'control' | 'image' | 'text') {
  return {
    bounds: bounds(24, 24),
    fixedSize: null,
    focalPointBounds: kind === 'image' ? bounds(12, 12, 6, 6) : null,
    id,
    kind,
    readingOrder: kind === 'text' ? 1 : null,
    textLineCount: kind === 'text' ? 1 : null,
    textUnwrappedWidth: kind === 'text' ? 24 : null,
    visualOrder: kind === 'text' ? 1 : null,
  };
}

/*** Creates finite positive viewport or fixed dimensions for responsive measurements. */
function dimensions(height: number, width: number) {
  return { height, width };
}

/*** Creates finite positive element or focal-point geometry at an explicit origin. */
function bounds(height: number, width: number, x = 0, y = 0) {
  return { height, width, x, y };
}
