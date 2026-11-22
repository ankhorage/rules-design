import type { SpacingProximityObservation } from '../../types/spacingProximity.js';

interface Failure {
  readonly message: string;
  readonly values: readonly number[];
}

/*** Applies the frozen rule-specific policy to complete normalized adapter evidence. */
export function assessSpacingProximityObservation(
  observation: SpacingProximityObservation,
): Failure | null | undefined {
  const { value } = observation;
  switch (observation.kind) {
    case 'design.spacing.token-allowed':
      return tokens(value);
    case 'design.spacing.vertical-rhythm':
      return rhythm(value);
    case 'design.spacing.section-gap':
      return allowed(value, 'Section gaps include a value outside the permitted spacing values.');
    case 'design.spacing.container-padding':
      return padding(value);
    case 'design.proximity.related-grouping':
      return related(value);
    case 'design.proximity.unrelated-separation':
      return unrelated(value);
    case 'design.proximity.label-control':
      return pairs(value, 'Labels are farther from their controls than unrelated content.');
    case 'design.proximity.heading-content':
      return pairs(value, 'Headings are farther from their content than unrelated content.');
    case 'design.proximity.card-internals':
      return card(value);
    case 'design.spacing.double-application':
      return doubled(value);
    case 'design.spacing.unexpected-collapse':
      return collapsed(value);
  }
}

/*** Confirms each used token name and value exists in the permitted token inventory. */
function tokens(value: unknown): Failure | null | undefined {
  const source = record(value);
  const permitted = source === undefined ? undefined : tokenList(source.permittedTokens);
  const usages = source === undefined ? undefined : tokenList(source.tokenUsages);
  if (permitted === undefined || usages === undefined) return undefined;
  const invalid = usages.find(
    (usage) => !permitted.some((token) => token.name === usage.name && token.value === usage.value),
  );
  return invalid === undefined
    ? null
    : {
        message: `Spacing token "${invalid.name}" is not permitted at its measured value.`,
        values: [invalid.value],
      };
}

/*** Confirms measured vertical gaps are whole units of the supplied rhythm. */
function rhythm(value: unknown): Failure | null | undefined {
  const source = record(value);
  const gaps = source === undefined ? undefined : numbers(source.gaps);
  const unit = source?.rhythmUnit;
  if (gaps === undefined || !positive(unit)) return undefined;
  const invalid = gaps.find((gap) => gap % unit !== 0);
  return invalid === undefined
    ? null
    : {
        message: 'A measured vertical gap is not a whole multiple of the rhythm unit.',
        values: [invalid, unit],
      };
}

/*** Confirms each measured gap is a permitted spacing value. */
function allowed(value: unknown, message: string): Failure | null | undefined {
  const source = record(value);
  const gaps = source === undefined ? undefined : numbers(source.gaps);
  const permitted = source === undefined ? undefined : numbers(source.permittedValues);
  if (gaps === undefined || permitted === undefined) return undefined;
  const invalid = gaps.find((gap) => !permitted.includes(gap));
  return invalid === undefined ? null : { message, values: [invalid] };
}

/*** Confirms all four measured container edges use permitted padding values. */
function padding(value: unknown): Failure | null | undefined {
  const source = record(value);
  const permitted = source === undefined ? undefined : numbers(source.permittedValues);
  const containers = source?.containers;
  if (permitted === undefined || !Array.isArray(containers) || containers.length === 0)
    return undefined;
  const values = containers.flatMap(edges);
  if (values.length !== containers.length * 4) return undefined;
  const invalid = values.find((item) => !permitted.includes(item));
  return invalid === undefined
    ? null
    : {
        message: 'Container padding includes a value outside the permitted spacing values.',
        values: [invalid],
      };
}

/*** Confirms related members are no farther apart than their nearest unrelated group. */
function related(value: unknown): Failure | null | undefined {
  const groups = relatedGroups(value);
  if (groups === undefined) return undefined;
  const invalid = groups.find((group) =>
    group.distances.some((distance) => distance > group.reference),
  );
  return invalid === undefined
    ? null
    : {
        message: 'A related group has a larger internal distance than its nearest unrelated group.',
        values: [...invalid.distances, invalid.reference],
      };
}

/*** Confirms unrelated groups exceed every internal grouping distance. */
function unrelated(value: unknown): Failure | null | undefined {
  const groups = unrelatedGroups(value);
  if (groups === undefined) return undefined;
  const invalid = groups.find((group) =>
    group.distances.some((distance) => distance >= group.reference),
  );
  return invalid === undefined
    ? null
    : {
        message: 'An unrelated group is not separated beyond its internal grouping distances.',
        values: [...invalid.distances, invalid.reference],
      };
}

/*** Confirms each label-control or heading-content pair beats its unrelated distance. */
function pairs(value: unknown, message: string): Failure | null | undefined {
  const groups = relatedGroups(value);
  if (groups === undefined || groups.some((group) => group.distances.length !== 1))
    return undefined;
  const invalid = groups.find((group) => (group.distances[0] ?? 0) > group.reference);
  return invalid === undefined
    ? null
    : { message, values: [invalid.distances[0] ?? 0, invalid.reference] };
}

/*** Confirms card internals remain closer than outside content. */
function card(value: unknown): Failure | null | undefined {
  const cards = cardGroups(value);
  if (cards === undefined) return undefined;
  const invalid = cards.find((item) =>
    item.distances.some((distance) => distance > item.reference),
  );
  return invalid === undefined
    ? null
    : {
        message: 'A card internal distance exceeds the measured distance to outside content.',
        values: [...invalid.distances, invalid.reference],
      };
}

/*** Detects cumulative parent and child spacing in a rendered distance. */
function doubled(value: unknown): Failure | null | undefined {
  const triples = spacingTriples(value);
  if (triples === undefined) return undefined;
  const invalid = triples.find((item) => item.third > Math.max(item.first, item.second));
  return invalid === undefined
    ? null
    : {
        message: 'Parent and child spacing accumulate into a larger rendered distance.',
        values: [invalid.first, invalid.second, invalid.third],
      };
}

/*** Detects a collapsed gap where structure proves margins should remain separated. */
function collapsed(value: unknown): Failure | null | undefined {
  const source = record(value);
  const pairs = source?.pairs;
  if (!Array.isArray(pairs) || pairs.length === 0) return undefined;
  const margins = pairs.map(collapse);
  if (margins.some((margin) => margin === undefined)) return undefined;
  const invalid = margins.find(
    (margin) => margin?.separates && margin.rendered < margin.preceding + margin.following,
  );
  return invalid === undefined
    ? null
    : {
        message: 'A structurally separated margin pair has a collapsed rendered distance.',
        values: [invalid.preceding, invalid.following, invalid.rendered],
      };
}

/*** Parses a finite non-negative measurement list. */
function numbers(value: unknown): readonly number[] | undefined {
  return Array.isArray(value) && value.length > 0 && value.every(measurement) ? value : undefined;
}
/*** Parses named spacing tokens. */
function tokenList(
  value: unknown,
): readonly { readonly name: string; readonly value: number }[] | undefined {
  return Array.isArray(value) && value.length > 0 && value.every(token) ? value : undefined;
}
/*** Parses a four-edge padding measurement. */
function edges(value: unknown): readonly number[] {
  return isRecord(value) &&
    measurement(value.top) &&
    measurement(value.right) &&
    measurement(value.bottom) &&
    measurement(value.left)
    ? [value.top, value.right, value.bottom, value.left]
    : [];
}
/*** Parses groups of related distances and their nearest unrelated distance. */
function relatedGroups(
  value: unknown,
): readonly { readonly distances: readonly number[]; readonly reference: number }[] | undefined {
  const source = record(value);
  const collection = source?.groups;
  if (!Array.isArray(collection) || collection.length === 0) return undefined;
  const groups = collection.map((item) => {
    const itemRecord = record(item);
    const distances = itemRecord === undefined ? undefined : numbers(itemRecord.relatedDistances);
    const reference = itemRecord?.nearestUnrelatedDistance;
    return distances === undefined || !measurement(reference)
      ? undefined
      : { distances, reference };
  });
  return groups.every(group) ? groups : undefined;
}
/*** Parses groups of internal distances and their unrelated-group distance. */
function unrelatedGroups(
  value: unknown,
): readonly { readonly distances: readonly number[]; readonly reference: number }[] | undefined {
  const source = record(value);
  const collection = source?.groups;
  if (!Array.isArray(collection) || collection.length === 0) return undefined;
  const groups = collection.map((item) => {
    const itemRecord = record(item);
    const distances = itemRecord === undefined ? undefined : numbers(itemRecord.internalDistances);
    const reference = itemRecord?.unrelatedDistance;
    return distances === undefined || !measurement(reference)
      ? undefined
      : { distances, reference };
  });
  return groups.every(group) ? groups : undefined;
}
/*** Parses card-internal distances and their nearest outside-content distance. */
function cardGroups(
  value: unknown,
): readonly { readonly distances: readonly number[]; readonly reference: number }[] | undefined {
  const source = record(value);
  const collection = source?.cards;
  if (!Array.isArray(collection) || collection.length === 0) return undefined;
  const groups = collection.map((item) => {
    const itemRecord = record(item);
    const distances = itemRecord === undefined ? undefined : numbers(itemRecord.internalDistances);
    const reference = itemRecord?.nearestOutsideDistance;
    return distances === undefined || !measurement(reference)
      ? undefined
      : { distances, reference };
  });
  return groups.every(group) ? groups : undefined;
}
/*** Parses raw parent, child, and rendered spacing measurements. */
function spacingTriples(
  value: unknown,
):
  | readonly { readonly first: number; readonly second: number; readonly third: number }[]
  | undefined {
  const source = record(value);
  const pairs = source?.pairs;
  if (!Array.isArray(pairs) || pairs.length === 0) return undefined;
  const triples = pairs.map((item) => {
    const itemRecord = record(item);
    const first = itemRecord?.parentSpacing;
    const second = itemRecord?.childSpacing;
    const third = itemRecord?.renderedDistance;
    return measurement(first) && measurement(second) && measurement(third)
      ? { first, second, third }
      : undefined;
  });
  return triples.every(isTriple) ? triples : undefined;
}
/*** Parses one margin pair and its structural relationship. */
function collapse(value: unknown) {
  return isRecord(value) &&
    measurement(value.precedingMargin) &&
    measurement(value.followingMargin) &&
    measurement(value.renderedDistance) &&
    typeof value.separatesMargins === 'boolean'
    ? {
        following: value.followingMargin,
        preceding: value.precedingMargin,
        rendered: value.renderedDistance,
        separates: value.separatesMargins,
      }
    : undefined;
}
/*** Narrows a record-shaped serializable value. */
function record(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return isRecord(value) ? value : undefined;
}
/*** Narrows a token record. */
function token(value: unknown): value is { readonly name: string; readonly value: number } {
  return (
    isRecord(value) &&
    typeof value.name === 'string' &&
    value.name.length > 0 &&
    measurement(value.value)
  );
}
/*** Narrows a complete parsed group. */
function group(
  value: { readonly distances: readonly number[]; readonly reference: number } | undefined,
): value is { readonly distances: readonly number[]; readonly reference: number } {
  return value !== undefined;
}
/*** Narrows a complete parsed spacing triple. */
function isTriple(
  value: { readonly first: number; readonly second: number; readonly third: number } | undefined,
): value is { readonly first: number; readonly second: number; readonly third: number } {
  return value !== undefined;
}
/*** Narrows a serializable record. */
function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/*** Narrows a finite non-negative layout measurement. */
function measurement(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}
/*** Narrows a finite positive layout measurement. */
function positive(value: unknown): value is number {
  return measurement(value) && value > 0;
}
