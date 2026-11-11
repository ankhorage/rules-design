import type { TypographyObservation } from '../../types/typography.js';

/*** Creates the shared completeness and viewport grouping operations for Typography evidence. */
export function createTypographyObservationTools() {
  return { measurementsComplete, orderedHeadings, viewports };
}

type TypographyMeasurement = keyof TypographyObservation;

/*** Checks required measurements and document-order uniqueness when a rule needs it. */
function measurementsComplete(
  observations: readonly TypographyObservation[],
  measurements: readonly TypographyMeasurement[],
): boolean {
  return (
    observations.every((observation) =>
      measurements.every((measurement) => measurementAvailable(observation, measurement)),
    ) &&
    (!measurements.includes('documentOrder') ||
      viewports(observations).every((viewport) => uniqueDocumentOrder(viewport)))
  );
}

/*** Checks one named observation measurement without indexing dynamic external property names. */
function measurementAvailable(
  observation: TypographyObservation,
  measurement: TypographyMeasurement,
): boolean {
  switch (measurement) {
    case 'documentOrder':
      return observation.documentOrder !== null;
    case 'headingLevel':
      return observation.headingLevel !== null;
    case 'marginAfter':
      return observation.marginAfter !== null;
    case 'marginBefore':
      return observation.marginBefore !== null;
    case 'paragraphMeasure':
      return observation.paragraphMeasure !== null;
    case 'responsiveRole':
      return observation.responsiveRole !== null;
    case 'semanticStyle':
      return observation.semanticStyle !== null;
    case 'textClipped':
      return observation.textClipped !== null;
    default:
      return true;
  }
}

/*** Groups observations by responsive viewport so rendered variants remain independent. */
function viewports(
  observations: readonly TypographyObservation[],
): readonly (readonly TypographyObservation[])[] {
  return Object.values(Object.groupBy(observations, (observation) => observation.viewport)).flatMap(
    (viewport) => (viewport === undefined ? [] : [viewport]),
  );
}

/*** Confirms that every heading in one viewport has a distinct document position. */
function uniqueDocumentOrder(observations: readonly TypographyObservation[]): boolean {
  const documentOrders = observations.map((observation) => observation.documentOrder);
  return (
    documentOrders.every((order) => order !== null) &&
    new Set(documentOrders).size === documentOrders.length
  );
}

/*** Sorts complete heading observations by explicit document order. */
function orderedHeadings(
  observations: readonly TypographyObservation[],
): readonly (TypographyObservation & {
  readonly documentOrder: number;
  readonly headingLevel: number;
})[] {
  return observations
    .filter(hasDocumentOrderAndHeadingLevel)
    .toSorted((left, right) => left.documentOrder - right.documentOrder);
}

/*** Confirms that an observation can participate in a document heading hierarchy. */
function hasDocumentOrderAndHeadingLevel(
  observation: TypographyObservation,
): observation is TypographyObservation & {
  readonly documentOrder: number;
  readonly headingLevel: number;
} {
  return observation.documentOrder !== null && observation.headingLevel !== null;
}
