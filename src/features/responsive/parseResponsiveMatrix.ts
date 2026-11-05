import { isRecord } from '@ankhorage/utility/object';

import type {
  ResponsiveBounds,
  ResponsiveDimensions,
  ResponsiveElement,
  ResponsiveMatrix,
  ResponsiveViewport,
} from '../../types/responsive';

/*** Parses the serializable responsive fact payload without assuming host runtime objects. */
export function parseResponsiveMatrix(value: unknown): ResponsiveMatrix | null {
  if (!isRecord(value)) return null;
  const { minimumTouchTarget, requiredBreakpointIds, requiredOrientations, viewports } = value;
  const parsedBreakpoints = parseStrings(requiredBreakpointIds);
  const parsedOrientations = parseOrientations(requiredOrientations);
  const parsedViewports = parseViewports(viewports);
  return parsedBreakpoints === null ||
    parsedOrientations === null ||
    parsedViewports === null ||
    !isPositiveFiniteNumber(minimumTouchTarget)
    ? null
    : {
        minimumTouchTarget,
        requiredBreakpointIds: parsedBreakpoints,
        requiredOrientations: parsedOrientations,
        viewports: parsedViewports,
      };
}

/*** Parses the measured viewport collection from a serializable fact payload. */
function parseViewports(value: unknown): readonly ResponsiveViewport[] | null {
  if (!Array.isArray(value)) return null;
  const viewports = value.map(parseViewport);
  return viewports.every(isViewport) ? viewports : null;
}

/*** Checks whether one parsed value is a complete responsive viewport. */
function isViewport(value: ResponsiveViewport | null): value is ResponsiveViewport {
  return value !== null;
}

/*** Parses one measured viewport while retaining only explicit responsive facts. */
function parseViewport(value: unknown): ResponsiveViewport | null {
  if (!isRecord(value) || !isRecord(value.layout)) return null;
  const { elements, id, orientation, size, zoom } = value;
  const { renderedWidth, scrollWidth } = value.layout;
  const parsedElements = parseElements(elements);
  return typeof id !== 'string' ||
    !isOrientation(orientation) ||
    !isPositiveFiniteNumber(zoom) ||
    !isDimensions(size) ||
    !isNonNegativeFiniteNumber(renderedWidth) ||
    !isNonNegativeFiniteNumber(scrollWidth) ||
    parsedElements === null
    ? null
    : {
        elements: parsedElements,
        id,
        layout: { renderedWidth, scrollWidth },
        orientation,
        size,
        zoom,
      };
}

/*** Parses the responsive element measurements from one viewport. */
function parseElements(value: unknown): readonly ResponsiveElement[] | null {
  if (!Array.isArray(value)) return null;
  const elements = value.map(parseElement);
  return elements.every(isElement) ? elements : null;
}

/*** Checks whether one parsed value is a complete responsive element. */
function isElement(value: ResponsiveElement | null): value is ResponsiveElement {
  return value !== null;
}

/*** Parses one measured text, control, or image element. */
function parseElement(value: unknown): ResponsiveElement | null {
  if (!isRecord(value) || !isRecord(value.bounds)) return null;
  const { fixedSize, focalPointBounds, id, kind, readingOrder, textLineCount, visualOrder } = value;
  return typeof id !== 'string' ||
    !isElementKind(kind) ||
    !isBounds(value.bounds) ||
    !isNullableDimensions(fixedSize) ||
    !isNullableBounds(focalPointBounds) ||
    !isNullableFiniteNumber(readingOrder) ||
    !isNullablePositiveInteger(textLineCount) ||
    !isNullablePositiveFiniteNumber(value.textUnwrappedWidth) ||
    !isNullableFiniteNumber(visualOrder)
    ? null
    : {
        bounds: value.bounds,
        fixedSize,
        focalPointBounds,
        id,
        kind,
        readingOrder,
        textLineCount,
        textUnwrappedWidth: value.textUnwrappedWidth,
        visualOrder,
      };
}

/*** Parses a serializable list of identifier strings. */
function parseStrings(value: unknown): readonly string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : null;
}

/*** Parses the declared orientation coverage set from normalized facts. */
function parseOrientations(value: unknown): readonly ('landscape' | 'portrait')[] | null {
  return Array.isArray(value) && value.every(isOrientation) ? value : null;
}

/*** Checks the two portable orientation values accepted by the responsive fact contract. */
function isOrientation(value: unknown): value is 'landscape' | 'portrait' {
  return value === 'landscape' || value === 'portrait';
}

/*** Checks the semantic element kinds evaluated by this responsive family. */
function isElementKind(value: unknown): value is ResponsiveElement['kind'] {
  return value === 'control' || value === 'image' || value === 'text';
}

/*** Checks an optional numeric ordering fact whose unknown state is explicit. */
function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value);
}

/*** Checks finite, positive viewport or fixed dimensions. */
function isDimensions(value: unknown): value is ResponsiveDimensions {
  return (
    isRecord(value) && isPositiveFiniteNumber(value.width) && isPositiveFiniteNumber(value.height)
  );
}

/*** Checks finite element or focal-point geometry with a positive rendered area. */
function isBounds(value: unknown): value is ResponsiveBounds {
  return (
    isDimensions(value) && isRecord(value) && isFiniteNumber(value.x) && isFiniteNumber(value.y)
  );
}

/*** Checks an explicitly absent or complete fixed-size measurement. */
function isNullableDimensions(value: unknown): value is ResponsiveDimensions | null {
  return value === null || isDimensions(value);
}

/*** Checks an explicitly absent or complete focal-point geometry measurement. */
function isNullableBounds(value: unknown): value is ResponsiveBounds | null {
  return value === null || isBounds(value);
}

/*** Checks a finite numeric measurement. */
function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/*** Checks a finite measurement that cannot be negative. */
function isNonNegativeFiniteNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

/*** Checks a finite measurement that must describe a non-zero dimension or zoom. */
function isPositiveFiniteNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}

/*** Checks an explicitly absent or positive whole line-count measurement. */
function isNullablePositiveInteger(value: unknown): value is number | null {
  return value === null || (isFiniteNumber(value) && Number.isInteger(value) && value > 0);
}

/*** Checks an explicitly absent or finite positive intrinsic inline-size measurement. */
function isNullablePositiveFiniteNumber(value: unknown): value is number | null {
  return value === null || isPositiveFiniteNumber(value);
}
