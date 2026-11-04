import type { FactEnvelope } from '@ankhorage/contracts/rules';

export interface ResponsiveDesignContext {
  readonly facts: readonly FactEnvelope[];
}

export interface ResponsiveMatrix {
  readonly minimumTouchTarget: number;
  readonly requiredBreakpointIds: readonly string[];
  readonly requiredOrientations: readonly ('landscape' | 'portrait')[];
  readonly viewports: readonly ResponsiveViewport[];
}

export interface ResponsiveViewport {
  readonly elements: readonly ResponsiveElement[];
  readonly id: string;
  readonly layout: {
    readonly horizontalOverflow: boolean;
    readonly orientationRobust: boolean;
    readonly reflowed: boolean;
    readonly zoomReflowed: boolean;
  };
  readonly orientation: 'landscape' | 'portrait';
  readonly zoom: number;
}

export interface ResponsiveElement {
  readonly bounds: { readonly height: number; readonly width: number };
  readonly focalPointVisible: boolean | null;
  readonly hasProblematicFixedDimensions: boolean;
  readonly id: string;
  readonly kind: 'control' | 'image' | 'text';
  readonly readingOrder: number | null;
  readonly textWrapsMeaningfully: boolean | null;
  readonly visualOrder: number | null;
}
