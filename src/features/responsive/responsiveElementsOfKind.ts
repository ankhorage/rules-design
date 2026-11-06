import type { ResponsiveElement, ResponsiveMatrix } from '../../types/responsive';

/*** Returns all normalized measurements for one semantic element kind. */
export function responsiveElementsOfKind(
  matrix: ResponsiveMatrix,
  kind: ResponsiveElement['kind'],
): readonly ResponsiveElement[] {
  return allResponsiveElements(matrix).filter((element) => element.kind === kind);
}

/*** Flattens measured viewport elements without mutating their fact data. */
function allResponsiveElements(matrix: ResponsiveMatrix): readonly ResponsiveElement[] {
  return matrix.viewports.flatMap((viewport) => viewport.elements);
}
