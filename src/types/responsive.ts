import type { FactEnvelope } from '@ankhorage/contracts/rules';

export interface ResponsiveDesignContext {
  readonly facts: readonly FactEnvelope[];
}

/*** One deterministic Responsive rule result derived from normalized measurements. */
export interface ResponsiveEvaluation {
  readonly failingIds: readonly string[];
  readonly message: string;
  readonly status: 'FAIL' | 'INCOMPLETE' | 'PASS';
}

export interface ResponsiveMatrix {
  readonly requiredBreakpointIds: readonly string[];
  readonly requiredOrientations: readonly ('landscape' | 'portrait')[];
  readonly viewports: readonly ResponsiveViewport[];
}

export interface ResponsiveViewport {
  readonly elements: readonly ResponsiveElement[];
  readonly id: string;
  readonly layout: {
    readonly renderedWidth: number;
    readonly scrollWidth: number;
  };
  readonly orientation: 'landscape' | 'portrait';
  readonly size: ResponsiveDimensions;
  readonly zoom: number;
}

export interface ResponsiveElement {
  readonly bounds: ResponsiveBounds;
  readonly fixedSize: ResponsiveDimensions | null;
  readonly focalPointBounds: ResponsiveBounds | null;
  readonly id: string;
  readonly kind: 'control' | 'image' | 'text';
  readonly readingOrder: number | null;
  readonly textLineCount: number | null;
  readonly textUnwrappedWidth: number | null;
  readonly visualOrder: number | null;
}

export interface ResponsiveBounds extends ResponsiveDimensions {
  readonly x: number;
  readonly y: number;
}

export interface ResponsiveDimensions {
  readonly height: number;
  readonly width: number;
}
