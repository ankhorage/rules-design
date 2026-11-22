import type { ResponsiveElement } from '../../types/responsive.js';

/*** Checks whether measured focal geometry remains within the image's visible bounds. */
export function isContainedInResponsiveBounds(
  container: ResponsiveElement['bounds'],
  candidate: ResponsiveElement['bounds'],
): boolean {
  return (
    candidate.x >= container.x &&
    candidate.y >= container.y &&
    candidate.x + candidate.width <= container.x + container.width &&
    candidate.y + candidate.height <= container.y + container.height
  );
}
