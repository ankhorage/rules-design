import { isRecord } from '@ankhorage/utility/object';

import type {
  WebsiteDesignNodeRecognition,
  WebsiteDesignPropertyObservation,
  WebsiteDesignSourceReference,
  WebsiteDesignTokenCandidate,
} from '../../types/websiteDesignRecognition';

type TokenKind = WebsiteDesignTokenCandidate['kind'];
type TokenObservation = WebsiteDesignSourceReference & {
  readonly property: string;
  readonly value: string;
};

const tokenKinds: readonly TokenKind[] = ['color', 'radius', 'shadow', 'spacing', 'typography'];

/*** Finds repeated exact design literals and records them as role-free reusable token candidates. */
export function tokenCandidates(
  nodes: readonly WebsiteDesignNodeRecognition[],
): readonly WebsiteDesignTokenCandidate[] {
  return tokenKinds.flatMap((kind) => candidatesForKind(nodes, kind));
}

/*** Extracts deterministic repeated candidates for one design-token family. */
function candidatesForKind(nodes: readonly WebsiteDesignNodeRecognition[], kind: TokenKind) {
  const observations = nodes.flatMap((node) => tokenObservationsForKind(node, kind));
  return [
    ...Map.groupBy(
      observations,
      (observation) => `${observation.property}\u0000${observation.value}`,
    ).entries(),
  ]
    .filter(([, values]) => sourceReferences(values).length > 1)
    .map(([, values]) => ({
      kind,
      property: values[0].property,
      value: values[0].value,
      originalValues: [...new Set(values.map((item) => item.value))],
      sourceRefs: sourceReferences(values),
      confidence: sourceReferences(values).length / sourceReferences(observations).length,
      inferredRole: null,
    }))
    .toSorted(
      (left, right) =>
        left.property.localeCompare(right.property) || left.value.localeCompare(right.value),
    );
}

/*** Extracts deterministic page-qualified source identities so viewport samples do not fabricate repetition. */
function sourceReferences(
  observations: readonly WebsiteDesignSourceReference[],
): readonly WebsiteDesignSourceReference[] {
  return [
    ...new Map(
      observations.map((observation) => [
        sourceReferenceKey(observation),
        { pageId: observation.pageId, sourceRef: observation.sourceRef },
      ]),
    ).values(),
  ].toSorted((left, right) => sourceReferenceKey(left).localeCompare(sourceReferenceKey(right)));
}

/*** Serializes the two-part observed-node identity only for deterministic deduplication and ordering. */
function sourceReferenceKey(reference: WebsiteDesignSourceReference): string {
  return `${reference.pageId}\u0000${reference.sourceRef}`;
}

/*** Selects only the observations that belong to one factual token family. */
function tokenObservationsForKind(
  node: WebsiteDesignNodeRecognition,
  kind: TokenKind,
): readonly TokenObservation[] {
  return observationsForKind(node, kind).flatMap((observation) =>
    tokenObservations(observation, kind),
  );
}

/*** Retains each exact scalar or spacing-edge literal with its CSS-property ownership. */
function tokenObservations(
  observation: WebsiteDesignPropertyObservation,
  kind: TokenKind,
): readonly TokenObservation[] {
  if (typeof observation.value === 'string') {
    return [
      { ...sourceReference(observation), property: observation.name, value: observation.value },
    ];
  }
  return kind === 'spacing' ? spacingEdgeTokenObservations(observation) : [];
}

/*** Expands a structured margin or padding value into its exact physical-edge token evidence. */
function spacingEdgeTokenObservations(
  observation: WebsiteDesignPropertyObservation,
): readonly TokenObservation[] {
  return isRecord(observation.value)
    ? Object.entries(observation.value).flatMap(([edge, value]) =>
        typeof value === 'string' && ['top', 'right', 'bottom', 'left'].includes(edge)
          ? [{ ...sourceReference(observation), property: `${observation.name}.${edge}`, value }]
          : [],
      )
    : [];
}

/*** Extracts the reusable page-qualified source identity from one design property observation. */
function sourceReference(
  observation: WebsiteDesignPropertyObservation,
): WebsiteDesignSourceReference {
  return { pageId: observation.pageId, sourceRef: observation.sourceRef };
}

/*** Selects only the property observations that belong to one factual token family. */
function observationsForKind(
  node: WebsiteDesignNodeRecognition,
  kind: TokenKind,
): readonly WebsiteDesignPropertyObservation[] {
  switch (kind) {
    case 'color':
      return node.colors.filter((observation) => observation.name !== 'opacity');
    case 'radius':
      return node.layout.filter((observation) => observation.name === 'borderRadius');
    case 'shadow':
      return node.layout.filter((observation) => observation.name === 'boxShadow');
    case 'spacing':
      return node.layout.filter((observation) =>
        ['gap', 'margin', 'padding'].includes(observation.name),
      );
    case 'typography':
      return node.typography;
  }
}
