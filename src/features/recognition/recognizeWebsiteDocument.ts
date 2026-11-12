import type { SerializableValue, UiNode } from '@ankhorage/contracts';
import type {
  WebsiteAsset,
  WebsiteDesignToken,
  WebsiteObservationDocument,
  WebsitePageObservation,
  WebsitePageRecognition,
  WebsiteRecognitionDocument,
  WebsiteRecognizedMedia,
  WebsiteRecognizedNode,
  WebsiteRecognizedProp,
  WebsiteResponsiveVariant,
} from '@ankhorage/contracts/website';

import type {
  WebsiteDesignNodeRecognition,
  WebsiteDesignPropertyObservation,
  WebsiteDesignTokenCandidate,
} from '../../types/websiteDesignRecognition';
import { recognizeWebsiteStructure } from '../website-recognition/recognizeWebsiteStructure';
import { createWebsiteAssetIndex } from './createWebsiteAssetIndex';
import { qualifyWebsiteRecognitionProps } from './qualifyWebsiteRecognitionProps';
import { recognizeWebsiteDesignProperties } from './recognizeWebsiteDesignProperties';
import { validateWebsiteObservationDocument } from './validateWebsiteObservationDocument';

/*** Assembles the public website recognition contract from structural and factual design recognition. */
export function recognizeWebsiteDocument(
  document: WebsiteObservationDocument,
): WebsiteRecognitionDocument {
  validateWebsiteObservationDocument(document);
  const design = recognizeWebsiteDesignProperties(document);
  const pages = recognizeWebsiteStructure(document).map((page) =>
    assemblePage(page, observedPageFor(document, page.id), design.nodes),
  );
  return {
    designTokens: design.tokenCandidates.map(assembleDesignToken),
    documentId: `recognition:${document.documentId}`,
    media: assembleMedia(document),
    navigation: document.pages.flatMap((page) =>
      page.navigation.map((item) => ({
        ...item,
        sourceRef: sourceIdentity(page.id, item.sourceRef),
      })),
    ),
    observedDocumentId: document.documentId,
    pages,
    recognizedAt: document.collectedAt,
    schemaVersion: 1,
    site: document.site,
    source: document.source,
  };
}

/*** Finds the validated observed page required to join a structural recognition. */
function observedPageFor(
  document: WebsiteObservationDocument,
  pageId: string,
): WebsitePageObservation {
  const page = document.pages.find((candidate) => candidate.id === pageId);
  if (page === undefined) throw new TypeError(`Missing observed page ${pageId}.`);
  return page;
}

/*** Joins factual design observations with the structural page tree by page-local source identity. */
function assemblePage(
  page: WebsitePageRecognition,
  observedPage: WebsitePageObservation,
  designNodes: readonly WebsiteDesignNodeRecognition[],
): WebsitePageRecognition {
  const designBySourceRef = new Map(
    designNodes
      .filter((node) => node.pageId === page.id)
      .map((node) => [node.sourceRef, node] as const),
  );
  const nodes = page.nodes.map((node) => assembleNode(node, observedPage, designBySourceRef));
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  return {
    ...page,
    nodes,
    root: assembleUiNode(page.root, page.id, nodesById),
  };
}

/*** Adds exact base, responsive, and unresolved design evidence to one structural recognition. */
function assembleNode(
  node: WebsiteRecognizedNode,
  page: WebsitePageObservation,
  designBySourceRef: ReadonlyMap<string, WebsiteDesignNodeRecognition>,
): WebsiteRecognizedNode {
  const design = node.sourceRefs.flatMap((sourceRef) => {
    const candidate = designBySourceRef.get(sourceRef);
    return candidate === undefined ? [] : [candidate];
  });
  const ownerDesign = design.filter((candidate) => candidate.sourceRef === node.id);
  const inheritedDesign = design.filter((candidate) => candidate.sourceRef !== node.id);
  const baseViewportId = page.viewports[0]?.id;
  const baseStateId = page.states[0]?.id;
  const designProperties = [...ownerDesign, ...inheritedDesign].flatMap((candidate) => [
    ...candidate.colors,
    ...candidate.typography,
    ...candidate.layout,
    ...candidate.responsive,
  ]);
  return {
    ...node,
    id: sourceIdentity(page.id, node.id),
    props: mergeProperties([
      ...node.props.map((property) => qualifyWebsiteRecognitionProps(property, page.id)),
      ...baseProperties(designProperties, baseViewportId, baseStateId),
      ...unresolvedProperties(design),
    ]),
    responsive: responsiveVariants(designProperties, baseViewportId, baseStateId),
    sourceRefs: node.sourceRefs.map((sourceRef) => sourceIdentity(page.id, sourceRef)),
    unresolved:
      node.unresolved === null
        ? null
        : {
            ...node.unresolved,
            sourceRefs: node.unresolved.sourceRefs.map((sourceRef) =>
              sourceIdentity(page.id, sourceRef),
            ),
          },
  };
}

/*** Selects the first declared viewport and state as the stable non-responsive property baseline. */
function baseProperties(
  observations: readonly WebsiteDesignPropertyObservation[],
  viewportId: string | undefined,
  stateId: string | undefined,
): readonly WebsiteRecognizedProp[] {
  return observations
    .filter(
      (observation) => observation.viewportId === viewportId && observation.stateId === stateId,
    )
    .map((observation) => propertyFromObservation(observation, stateId));
}

/*** Groups every non-baseline measured property by viewport without fabricating breakpoints. */
function responsiveVariants(
  observations: readonly WebsiteDesignPropertyObservation[],
  baseViewportId: string | undefined,
  baseStateId: string | undefined,
): readonly WebsiteResponsiveVariant[] {
  return [
    ...Map.groupBy(
      observations.filter(
        (observation) =>
          observation.viewportId !== baseViewportId || observation.stateId !== baseStateId,
      ),
      (observation) => observation.viewportId,
    ),
  ]
    .map(([viewportId, properties]) => ({
      props: mergeProperties(
        properties.map((observation) => propertyFromObservation(observation, baseStateId)),
      ),
      viewportId,
    }))
    .toSorted((left, right) => left.viewportId.localeCompare(right.viewportId));
}

/*** Represents unavailable source evidence explicitly inside the DTO's extensible property channel. */
function unresolvedProperties(
  design: readonly WebsiteDesignNodeRecognition[],
): readonly WebsiteRecognizedProp[] {
  return design.flatMap((node) =>
    node.unresolved.map((unresolved) => ({
      name: `unresolved:${unresolved.stateId}:${unresolved.viewportId}:${unresolved.kind}`,
      originalValues: [unresolvedValue(unresolved.missing)],
      value: unresolvedValue(unresolved.missing),
    })),
  );
}

/*** Converts the portable missing-value DTO to the serializable map shape required by property values. */
function unresolvedValue(missing: {
  readonly code: string;
  readonly message: string;
}): SerializableValue {
  return { code: missing.code, message: missing.message };
}

/*** Converts factual style samples to property names that retain state identity when it is not baseline. */
function propertyFromObservation(
  observation: WebsiteDesignPropertyObservation,
  baselineStateId: string | undefined,
): WebsiteRecognizedProp {
  return {
    name:
      observation.stateId === baselineStateId
        ? observation.name
        : `state:${observation.stateId}:${observation.name}`,
    originalValues: [observation.value],
    value: observation.value,
  };
}

/*** Merges duplicate property samples while retaining every original value in stable JSON order. */
function mergeProperties(
  properties: readonly WebsiteRecognizedProp[],
): readonly WebsiteRecognizedProp[] {
  return [...Map.groupBy(properties, (property) => property.name)]
    .map(([name, values]) => ({
      name,
      originalValues: uniqueSerializableValues(values.flatMap((value) => value.originalValues)),
      value: first(values).value,
    }))
    .toSorted((left, right) => left.name.localeCompare(right.name));
}

/*** Reads a non-empty collected group after the grouping operation that created it. */
function first<T>(values: readonly T[]): T {
  const [value] = values;
  if (value === undefined) throw new TypeError('Expected a non-empty collection.');
  return value;
}

/*** Deduplicates serializable literals by their exact JSON representation without coercion. */
function uniqueSerializableValues(
  values: readonly SerializableValue[],
): readonly SerializableValue[] {
  return [...new Map(values.map((value) => [JSON.stringify(value), value] as const)).values()];
}

/*** Rebuilds the canonical tree so node IDs and props agree with the assembled node mapping. */
function assembleUiNode(
  node: UiNode,
  pageId: string,
  nodesById: ReadonlyMap<string, WebsiteRecognizedNode>,
): UiNode {
  const recognized = nodesById.get(sourceIdentity(pageId, node.id));
  return {
    ...(node.children === undefined
      ? {}
      : { children: node.children.map((child) => assembleUiNode(child, pageId, nodesById)) }),
    id: sourceIdentity(pageId, node.id),
    ...(recognized === undefined || recognized.props.length === 0
      ? {}
      : {
          props: Object.fromEntries(
            recognized.props.map((property) => [property.name, property.value]),
          ),
        }),
    type: node.type,
  };
}

/*** Converts role-free factual token candidates to the published, source-qualified token contract. */
function assembleDesignToken(candidate: WebsiteDesignTokenCandidate): WebsiteDesignToken {
  return {
    id: JSON.stringify([candidate.kind, candidate.property, candidate.value]),
    kind: candidate.kind,
    originalValues: candidate.originalValues,
    sourceRefs: candidate.sourceRefs.map((reference) =>
      sourceIdentity(reference.pageId, reference.sourceRef),
    ),
    value: candidate.value,
  };
}

/*** Deduplicates media by known asset identity or exact anonymous media identity while retaining sources. */
function assembleMedia(document: WebsiteObservationDocument): readonly WebsiteRecognizedMedia[] {
  const assetIndex = createWebsiteAssetIndex(document);
  const references = [
    ...document.pages.flatMap((page) =>
      page.nodes.flatMap((node) => node.media.map((media) => ({ media, pageId: page.id }))),
    ),
    ...document.pages.flatMap((page) =>
      page.assets.flatMap((asset) =>
        (asset.sourceRefs.length === 0 ? [undefined] : asset.sourceRefs).map((sourceRef) => ({
          media: { assetId: asset.id, kind: asset.kind, sourceRef, url: asset.url },
          pageId: page.id,
        })),
      ),
    ),
  ];
  return [
    ...Map.groupBy(references, ({ media }) =>
      media.assetId === null ? `${media.kind}\u0000${media.url}` : `asset\u0000${media.assetId}`,
    ),
  ]
    .map(([identity, entries]) => assembleMediaGroup(identity, entries, assetIndex))
    .toSorted((left, right) => left.id.localeCompare(right.id));
}

/*** Assembles one deduplicated media record and rejects incompatible observations sharing an asset ID. */
function assembleMediaGroup(
  identity: string,
  entries: readonly {
    readonly pageId: string;
    readonly media: {
      readonly assetId: string | null;
      readonly url: string;
      readonly sourceRef: string | undefined;
    };
  }[],
  assetsById: ReadonlyMap<string, WebsiteAsset>,
): WebsiteRecognizedMedia {
  const firstEntry = first(entries);
  if (entries.some((entry) => entry.media.url !== firstEntry.media.url))
    throw new TypeError(`Conflicting URLs for media ${identity}.`);
  const asset =
    firstEntry.media.assetId === null ? undefined : assetsById.get(firstEntry.media.assetId);
  return {
    asset: asset === undefined ? null : { mediaId: asset.id },
    id: identity,
    originalUrl: firstEntry.media.url,
    sourceRefs: [
      ...new Set(
        entries.flatMap((entry) =>
          entry.media.sourceRef === undefined
            ? []
            : [sourceIdentity(entry.pageId, entry.media.sourceRef)],
        ),
      ),
    ],
  };
}

/*** Serializes a two-part source identity without delimiters that could collide with source content. */
function sourceIdentity(pageId: string, sourceRef: string): string {
  return JSON.stringify([pageId, sourceRef]);
}
