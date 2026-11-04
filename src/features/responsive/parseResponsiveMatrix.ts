import { isRecord } from '@ankhorage/utility/object';

import type {
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
    typeof minimumTouchTarget !== 'number' ||
    minimumTouchTarget <= 0
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
  const { elements, id, orientation, zoom } = value;
  const { horizontalOverflow, orientationRobust, reflowed, zoomReflowed } = value.layout;
  const parsedElements = parseElements(elements);
  return typeof id !== 'string' ||
    !isOrientation(orientation) ||
    typeof zoom !== 'number' ||
    !isBoolean(horizontalOverflow) ||
    !isBoolean(orientationRobust) ||
    !isBoolean(reflowed) ||
    !isBoolean(zoomReflowed) ||
    parsedElements === null
    ? null
    : {
        elements: parsedElements,
        id,
        layout: { horizontalOverflow, orientationRobust, reflowed, zoomReflowed },
        orientation,
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
  const {
    focalPointVisible,
    hasProblematicFixedDimensions,
    id,
    kind,
    readingOrder,
    textWrapsMeaningfully,
    visualOrder,
  } = value;
  const { height, width } = value.bounds;
  return typeof id !== 'string' ||
    !isElementKind(kind) ||
    typeof width !== 'number' ||
    typeof height !== 'number' ||
    !isBoolean(hasProblematicFixedDimensions) ||
    !isNullableBoolean(focalPointVisible) ||
    !isNullableBoolean(textWrapsMeaningfully) ||
    !isNullableNumber(readingOrder) ||
    !isNullableNumber(visualOrder)
    ? null
    : {
        bounds: { height, width },
        focalPointVisible,
        hasProblematicFixedDimensions,
        id,
        kind,
        readingOrder,
        textWrapsMeaningfully,
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

/*** Checks a required boolean fact. */
function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/*** Checks an optional boolean fact whose unknown state is explicit. */
function isNullableBoolean(value: unknown): value is boolean | null {
  return value === null || isBoolean(value);
}

/*** Checks an optional numeric ordering fact whose unknown state is explicit. */
function isNullableNumber(value: unknown): value is number | null {
  return value === null || typeof value === 'number';
}
