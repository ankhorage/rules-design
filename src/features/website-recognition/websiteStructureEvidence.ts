import type { WebsiteNodeObservation, WebsiteObservedNode } from '@ankhorage/contracts/website';

/*** Collects complete evidence needed to classify an observed website structure node. */
export function websiteStructureEvidence(
  node: WebsiteObservedNode,
  children: readonly WebsiteObservedNode[] = [],
): WebsiteStructureEvidence {
  return {
    availableObservation: availableObservation(node),
    hasCardSurface: hasCardSurface(node),
    hasVisualRole: hasVisualRole(node),
    isTransparentWrapper: isTransparentWrapper(node, children),
  };
}

interface WebsiteStructureEvidence {
  readonly availableObservation: WebsiteNodeObservation | null;
  readonly hasCardSurface: boolean;
  readonly hasVisualRole: boolean;
  readonly isTransparentWrapper: boolean;
}

/*** Selects a visible available observation deterministically without inventing a missing style. */
function availableObservation(node: WebsiteObservedNode): WebsiteNodeObservation | null {
  return (
    [...node.observations]
      .sort(
        (left, right) =>
          left.viewportId.localeCompare(right.viewportId) ||
          left.stateId.localeCompare(right.stateId),
      )
      .find(
        (observation) =>
          observation.availability.status === 'available' &&
          observation.css !== null &&
          observation.rect !== null &&
          observation.rect.width > 0 &&
          observation.rect.height > 0 &&
          observation.css.display !== 'none' &&
          observation.css.visibility !== 'hidden' &&
          observation.css.visibility !== 'collapse' &&
          observation.css.opacity !== '0',
      ) ?? null
  );
}

/*** Requires padding plus radius, border, or shadow so colored columns are not invented as cards. */
function hasCardSurface(node: WebsiteObservedNode): boolean {
  const css = availableObservation(node)?.css;
  return (
    css !== null &&
    css !== undefined &&
    hasNonZeroEdge(css.padding) &&
    (hasNonZeroCssValue(css.borderRadius) ||
      hasNonZeroCssValue(css.borderWidth) ||
      css.boxShadow !== 'none')
  );
}

/*** Tests whether a visible observation gives a generic node a layout or surface role. */
function hasVisualRole(node: WebsiteObservedNode): boolean {
  const observation = availableObservation(node);
  return observation !== null && (hasLayoutRole(observation) || hasSurfaceRole(observation));
}

/*** Identifies wrappers only when complete observations prove no independent role. */
function isTransparentWrapper(
  node: WebsiteObservedNode,
  children: readonly WebsiteObservedNode[],
): boolean {
  const tagName = node.dom.tagName.toLowerCase();
  return (
    children.length > 0 &&
    node.links.length === 0 &&
    node.media.length === 0 &&
    node.textRuns.length === 0 &&
    (tagName === 'div' || tagName === 'span') &&
    node.observations.length > 0 &&
    node.observations.every(isTransparentObservation)
  );
}

/*** Requires usable CSS evidence and excludes every measured layout or surface role. */
function isTransparentObservation(observation: WebsiteNodeObservation): boolean {
  return (
    observation.availability.status === 'available' &&
    observation.css !== null &&
    !hasLayoutRole(observation) &&
    !hasSurfaceRole(observation)
  );
}

/*** Identifies layout evidence that gives an otherwise generic container a real component role. */
function hasLayoutRole(observation: WebsiteNodeObservation): boolean {
  const { css } = observation;
  return (
    css !== null &&
    (css.display.includes('grid') ||
      css.display.includes('flex') ||
      hasNonZeroEdge(css.padding) ||
      hasNonZeroEdge(css.margin) ||
      hasNonZeroCssValue(css.gap))
  );
}

/*** Identifies measured border, radius, background, or shadow evidence for a visual container. */
function hasSurfaceRole(observation: WebsiteNodeObservation): boolean {
  const { css } = observation;
  return (
    css !== null &&
    (hasNonZeroCssValue(css.borderRadius) ||
      hasNonZeroCssValue(css.borderWidth) ||
      css.boxShadow !== 'none' ||
      !isTransparentColor(css.backgroundColor))
  );
}

/*** Tests CSS box edges without parsing or normalizing their original literals. */
function hasNonZeroEdge(edges: {
  readonly top: string;
  readonly right: string;
  readonly bottom: string;
  readonly left: string;
}): boolean {
  return [edges.top, edges.right, edges.bottom, edges.left].some(hasNonZeroCssValue);
}

/*** Detects non-zero CSS literals while preserving their exact source value elsewhere. */
function hasNonZeroCssValue(value: string): boolean {
  return value !== '0' && value !== '0px' && value !== 'normal' && value !== 'auto';
}

/*** Recognizes transparent computed-color forms without assigning a color token. */
function isTransparentColor(value: string): boolean {
  return value === 'transparent' || value === 'rgba(0, 0, 0, 0)';
}
