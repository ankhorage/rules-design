import type { WebsiteNodeObservation, WebsiteObservedNode } from '@ankhorage/contracts/website';

/*** Collects complete evidence needed to classify an observed website structure node. */
export function websiteStructureEvidence(
  node: WebsiteObservedNode,
  children: readonly WebsiteObservedNode[] = [],
  parent: WebsiteObservedNode | null = null,
): WebsiteStructureEvidence {
  const cardSurfaceReasons = cardSurfaceReasonsForNode(node, parent);
  return {
    availableObservation: availableObservation(node),
    cardSurfaceReasons,
    hasCardSurface: cardSurfaceReasons.length > 0,
    hasDividerEvidence: hasDividerEvidence(node),
    hasVisualRole: hasVisualRole(node),
    isTransparentWrapper: isTransparentWrapper(node, children),
  };
}

interface WebsiteStructureEvidence {
  readonly availableObservation: WebsiteNodeObservation | null;
  readonly cardSurfaceReasons: readonly string[];
  readonly hasCardSurface: boolean;
  readonly hasDividerEvidence: boolean;
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

/*** Tests whether one observation proves a rendered, visible CSS box. */
function isVisibleObservation(observation: WebsiteNodeObservation): boolean {
  return (
    observation.availability.status === 'available' &&
    observation.css !== null &&
    observation.rect !== null &&
    observation.rect.width > 0 &&
    observation.rect.height > 0 &&
    observation.css.display !== 'none' &&
    observation.css.visibility !== 'hidden' &&
    observation.css.visibility !== 'collapse' &&
    observation.css.opacity !== '0'
  );
}

/*** Finds all independently owned Card-surface signals across visible viewport observations. */
function cardSurfaceReasonsForNode(
  node: WebsiteObservedNode,
  parent: WebsiteObservedNode | null,
): readonly string[] {
  return [
    ...new Set(
      node.observations.flatMap((observation) =>
        isVisibleObservation(observation)
          ? cardSurfaceReasonsForObservation(
              observation,
              parent === null ? null : observationFor(parent, observation),
            )
          : [],
      ),
    ),
  ];
}

/*** Identifies a visible horizontal or vertical line with independent divider semantics or geometry. */
function hasDividerEvidence(node: WebsiteObservedNode): boolean {
  const tagName = node.dom.tagName.toLowerCase();
  return node.observations.some(
    (observation) =>
      isVisibleObservation(observation) &&
      observation.css !== null &&
      observation.rect !== null &&
      hasVisibleSurfaceBoundary(observation, null) &&
      (tagName === 'hr' ||
        observation.semanticAttributes?.role === 'separator' ||
        hasDividerGeometry(observation.rect.width, observation.rect.height)),
  );
}

/*** Finds the observation for the same viewport and rendered state without mixing responsive evidence. */
function observationFor(
  node: WebsiteObservedNode,
  observation: WebsiteNodeObservation,
): WebsiteNodeObservation | null {
  return (
    node.observations.find(
      (candidate) =>
        candidate.viewportId === observation.viewportId &&
        candidate.stateId === observation.stateId,
    ) ?? null
  );
}

/*** Tests whether a measured rectangle has the proportions of a rendered separator line. */
function hasDividerGeometry(width: number, height: number): boolean {
  const shorterSide = Math.min(width, height);
  const longerSide = Math.max(width, height);
  return shorterSide <= 4 && longerSide >= 16 && longerSide / Math.max(shorterSide, 1) >= 8;
}

/*** Lists reusable visual-surface predicates; borders, radius and padding cannot match. */
function cardSurfaceReasonsForObservation(
  observation: WebsiteNodeObservation,
  parentObservation: WebsiteNodeObservation | null,
): readonly string[] {
  const { css } = observation;
  if (css === null) return [];
  return [
    ...(hasVisibleBackground(css.backgroundColor, parentObservation?.css?.backgroundColor ?? null)
      ? ['background-color']
      : []),
    ...(css.backgroundImage !== 'none' ? ['background-image'] : []),
    ...(hasVisibleBoxShadow(css.boxShadow) ? ['box-shadow'] : []),
  ];
}

/*** Shares the same owned-surface predicates with independent divider evidence. */
function hasOwnedCardSurface(
  observation: WebsiteNodeObservation,
  parentObservation: WebsiteNodeObservation | null,
): boolean {
  return cardSurfaceReasonsForObservation(observation, parentObservation).length > 0;
}

/*** Retains visible border evidence for actual dividers, not card classification. */
function hasVisibleSurfaceBoundary(
  observation: WebsiteNodeObservation,
  parentObservation: WebsiteNodeObservation | null,
): boolean {
  const { css } = observation;
  return (
    css !== null &&
    (hasOwnedCardSurface(observation, parentObservation) ||
      (hasNonZeroCssValue(css.borderWidth) && !isTransparentColor(css.borderColor)))
  );
}

/*** Compares composited CSS colors so transparent backgrounds remain surface evidence when visible. */
function hasVisibleBackground(
  backgroundColor: string,
  parentBackgroundColor: string | null,
): boolean {
  const color = parseCssColor(backgroundColor);
  if (color === null)
    return !isTransparentColor(backgroundColor) && backgroundColor !== parentBackgroundColor;
  if (color.alpha === 0) return false;
  if (parentBackgroundColor === null) return true;
  const parentColor = parseCssColor(parentBackgroundColor);
  if (parentColor === null) return backgroundColor !== parentBackgroundColor;
  return !sameColor(compositeColor(color, parentColor), parentColor);
}

/*** Parses browser-computed rgb and rgba color values without fabricating color tokens. */
function parseCssColor(value: string): RgbaColor | null {
  if (value === 'transparent') return { alpha: 0, blue: 0, green: 0, red: 0 };
  const match =
    /^rgba?\(\s*([\d.]+)[,\s]+\s*([\d.]+)[,\s]+\s*([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/.exec(
      value,
    );
  if (match === null) return null;
  const alpha = match.at(-1);
  return {
    alpha: alpha === undefined ? 1 : Number(alpha),
    blue: Number(match[3]),
    green: Number(match[2]),
    red: Number(match[1]),
  };
}

interface RgbaColor {
  readonly alpha: number;
  readonly blue: number;
  readonly green: number;
  readonly red: number;
}

/*** Composites a foreground color over its observed parent background. */
function compositeColor(foreground: RgbaColor, background: RgbaColor): RgbaColor {
  const alpha = foreground.alpha + background.alpha * (1 - foreground.alpha);
  if (alpha === 0) return { alpha: 0, blue: 0, green: 0, red: 0 };
  const compositeChannel = (foregroundChannel: number, backgroundChannel: number) =>
    (foregroundChannel * foreground.alpha +
      backgroundChannel * background.alpha * (1 - foreground.alpha)) /
    alpha;
  return {
    alpha,
    blue: compositeChannel(foreground.blue, background.blue),
    green: compositeChannel(foreground.green, background.green),
    red: compositeChannel(foreground.red, background.red),
  };
}

/*** Compares parsed colors with a small tolerance for browser-computed floating point values. */
function sameColor(left: RgbaColor, right: RgbaColor): boolean {
  return [
    left.red - right.red,
    left.green - right.green,
    left.blue - right.blue,
    left.alpha - right.alpha,
  ].every((difference) => Math.abs(difference) < 0.001);
}

/*** Excludes shadows whose entire computed color is transparent. */
function hasVisibleBoxShadow(value: string): boolean {
  return value !== 'none' && !/rgba\([^)]*,\s*0\s*\)/.test(value);
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
  return value === 'transparent' || parseCssColor(value)?.alpha === 0;
}
