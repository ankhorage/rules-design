import type {
  ResponsiveElement,
  ResponsiveEvaluation,
  ResponsiveMatrix,
} from '../../types/responsive';
import { responsiveElementsOfKind } from './responsiveElementsOfKind';

/*** Assesses reading and visual order only when all measured text order values are available. */
export function evaluateResponsiveOrder(matrix: ResponsiveMatrix): ResponsiveEvaluation {
  const text = responsiveElementsOfKind(matrix, 'text');
  if (text.length === 0)
    return incomplete('No reading and visual order measurements were supplied.');
  const incompleteOrder = text.filter(
    (element) => element.readingOrder === null || element.visualOrder === null,
  );
  if (incompleteOrder.length > 0) {
    return incomplete(
      'Reading and visual order measurements are incomplete.',
      incompleteOrder.map((item) => item.id),
    );
  }
  const reordered = text
    .filter(hasOrder)
    .filter((element) => element.readingOrder !== element.visualOrder);
  return reordered.length === 0
    ? pass()
    : fail(
        'Visual order differs from reading order.',
        reordered.map((item) => item.id),
      );
}

/*** Narrows a text observation to complete reading and visual order measurements. */
function hasOrder(
  element: ResponsiveElement,
): element is ResponsiveElement & { readonly readingOrder: number; readonly visualOrder: number } {
  return element.readingOrder !== null && element.visualOrder !== null;
}

/*** Returns a passing order assessment. */
function pass(): ResponsiveEvaluation {
  return { failingIds: [], message: '', status: 'PASS' };
}

/*** Returns a failed or incomplete order assessment with affected text identities. */
function fail(message: string, failingIds: readonly string[]): ResponsiveEvaluation {
  return { failingIds, message, status: 'FAIL' };
}

/*** Returns an incomplete order assessment when measurements are absent. */
function incomplete(message: string, failingIds: readonly string[] = []): ResponsiveEvaluation {
  return { failingIds, message, status: 'INCOMPLETE' };
}
