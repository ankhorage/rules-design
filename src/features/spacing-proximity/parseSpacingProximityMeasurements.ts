import type { SpacingProximityObservation } from '../../types/spacingProximity.js';

/*** Parses a complete versioned sequence of raw spacing and proximity observations. */
export function parseSpacingProximityMeasurements(
  value: unknown,
): readonly SpacingProximityObservation[] | undefined {
  if (!isRecord(value) || value.schemaVersion !== 2 || !Array.isArray(value.observations))
    return undefined;
  const observations = value.observations.map(parseObservation);
  return observations.every(isObservation) ? observations : undefined;
}

/*** Parses one adapter observation containing a frozen rule ID and raw serializable evidence. */
function parseObservation(value: unknown): SpacingProximityObservation | undefined {
  if (!isRecord(value) || !isRuleId(value.kind) || value.value === undefined) return undefined;
  return { kind: value.kind, value: value.value };
}

/*** Narrows a parsed value to a complete spacing or proximity observation. */
function isObservation(
  value: SpacingProximityObservation | undefined,
): value is SpacingProximityObservation {
  return value !== undefined;
}

/*** Narrows a serializable unknown value to a record without assuming a prototype. */
function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/*** Narrows the only frozen rule IDs permitted in this group-local evidence schema. */
function isRuleId(value: unknown): value is SpacingProximityObservation['kind'] {
  return (
    typeof value === 'string' &&
    [
      'design.spacing.token-allowed',
      'design.spacing.vertical-rhythm',
      'design.spacing.section-gap',
      'design.spacing.container-padding',
      'design.proximity.related-grouping',
      'design.proximity.unrelated-separation',
      'design.proximity.label-control',
      'design.proximity.heading-content',
      'design.proximity.card-internals',
      'design.spacing.double-application',
      'design.spacing.unexpected-collapse',
    ].includes(value)
  );
}
