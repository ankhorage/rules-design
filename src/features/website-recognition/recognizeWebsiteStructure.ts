import type { UiNode } from '@ankhorage/contracts';
import type {
  WebsiteNodeObservation,
  WebsiteObservationDocument,
  WebsiteObservedNode,
  WebsitePageObservation,
  WebsitePageRecognition,
  WebsiteRecognizedNode,
} from '@ankhorage/contracts/website';

import { recognizeWebsiteStructureProps } from './recognizeWebsiteStructureProps';
import { recognizeWebsiteStructureSemanticComponentType } from './websiteStructureSemantics';
import {
  createWebsiteStructureTreeNode,
  createWebsiteStructureUnresolvedTreeNode,
} from './websiteStructureTreeNodes';

/*** Recognizes source-linked canonical component trees from validated website observations. */
export function recognizeWebsiteStructure(
  document: WebsiteObservationDocument,
): readonly WebsitePageRecognition[] {
  return document.pages.map(recognizePage);
}

export interface RecognizedTreeNode {
  readonly node: WebsiteRecognizedNode;
  readonly nodes: readonly WebsiteRecognizedNode[];
  readonly uiNode: UiNode;
}

/*** Recognizes one page while retaining every source node in the canonical tree or node mapping. */
function recognizePage(page: WebsitePageObservation): WebsitePageRecognition {
  const nodesBySourceRef = new Map(page.nodes.map((node) => [node.sourceRef, node]));
  const childNodesByParent = createChildNodesByParent(page.nodes);
  const rootNodes = page.nodes.filter(
    (node) => node.parentSourceRef === null || !nodesBySourceRef.has(node.parentSourceRef),
  );
  const recognizedNodes = rootNodes.flatMap((node) =>
    recognizeTreeNode(node, nodesBySourceRef, childNodesByParent, node.parentSourceRef, [], []),
  );
  const reachableSourceRefs = new Set(
    recognizedNodes.flatMap((node) => node.nodes.flatMap((item) => item.sourceRefs)),
  );
  const orphanedNodes = page.nodes.filter((node) => !reachableSourceRefs.has(node.sourceRef));
  const orphanedRecognitions = orphanedNodes.flatMap((node) =>
    recognizeTreeNode(node, nodesBySourceRef, childNodesByParent, null, [], []),
  );
  const allRecognitions = [...recognizedNodes, ...orphanedRecognitions];

  return {
    id: page.id,
    nodes: allRecognitions.flatMap((recognition) => recognition.nodes),
    path: page.path,
    root: {
      children: allRecognitions.map((recognition) => recognition.uiNode),
      id: `${page.id}:root`,
      type: 'Container',
    },
    url: page.url,
  };
}

/*** Indexes observed children in DOM order for deterministic parent traversal. */
function createChildNodesByParent(
  nodes: readonly WebsiteObservedNode[],
): ReadonlyMap<string, readonly WebsiteObservedNode[]> {
  const entries = nodes.reduce<ReadonlyMap<string, readonly WebsiteObservedNode[]>>(
    (childrenByParent, node) => {
      if (node.parentSourceRef === null) return childrenByParent;
      const siblings = childrenByParent.get(node.parentSourceRef) ?? [];
      return new Map(childrenByParent).set(node.parentSourceRef, [...siblings, node]);
    },
    new Map(),
  );
  return new Map(
    [...entries].map(([parentSourceRef, children]) => [
      parentSourceRef,
      [...children].sort(compareDomOrder),
    ]),
  );
}

/*** Orders source nodes by their observed sibling position and stable source reference. */
function compareDomOrder(left: WebsiteObservedNode, right: WebsiteObservedNode): number {
  return (
    left.dom.childIndex - right.dom.childIndex || left.sourceRef.localeCompare(right.sourceRef)
  );
}

/*** Recognizes one node and folds transparent wrappers into their meaningful descendants. */
function recognizeTreeNode(
  node: WebsiteObservedNode,
  nodesBySourceRef: ReadonlyMap<string, WebsiteObservedNode>,
  childNodesByParent: ReadonlyMap<string, readonly WebsiteObservedNode[]>,
  effectiveParentSourceRef: string | null,
  inheritedSourceRefs: readonly string[],
  ancestorSourceRefs: readonly string[],
): readonly RecognizedTreeNode[] {
  if (ancestorSourceRefs.includes(node.sourceRef)) {
    return [
      createWebsiteStructureUnresolvedTreeNode(
        node,
        inheritedSourceRefs,
        'Source hierarchy contains a cycle.',
      ),
    ];
  }
  const children = childNodesByParent.get(node.sourceRef) ?? [];
  if (isTransparentWrapper(node, children)) {
    return children.flatMap((child) =>
      recognizeTreeNode(
        child,
        nodesBySourceRef,
        childNodesByParent,
        effectiveParentSourceRef,
        [...inheritedSourceRefs, node.sourceRef],
        [...ancestorSourceRefs, node.sourceRef],
      ),
    );
  }
  const childRecognitions = children.flatMap((child) =>
    recognizeTreeNode(
      child,
      nodesBySourceRef,
      childNodesByParent,
      node.sourceRef,
      [],
      [...ancestorSourceRefs, node.sourceRef],
    ),
  );
  return [
    createRecognizedTreeNode(
      node,
      nodesBySourceRef.get(effectiveParentSourceRef ?? '') ?? null,
      childNodesByParent,
      inheritedSourceRefs,
      childRecognitions,
    ),
  ];
}

/*** Combines component classification, source lineage, and child mappings into one canonical node. */
function createRecognizedTreeNode(
  node: WebsiteObservedNode,
  parent: WebsiteObservedNode | null,
  childNodesByParent: ReadonlyMap<string, readonly WebsiteObservedNode[]>,
  inheritedSourceRefs: readonly string[],
  children: readonly RecognizedTreeNode[],
): RecognizedTreeNode {
  const componentType = recognizeComponentType(node, parent, childNodesByParent);
  const props = recognizeWebsiteStructureProps(node);
  return createWebsiteStructureTreeNode(
    node,
    componentType,
    uniqueSourceRefs([...inheritedSourceRefs, node.sourceRef]),
    props,
    children,
    availableObservation(node) === null
      ? 'No available rendered observation exists for this source node.'
      : 'Visible source node has no canonical component mapping.',
  );
}

/*** Identifies wrappers with no independently meaningful semantic, textual, media, or visual role. */
function isTransparentWrapper(
  node: WebsiteObservedNode,
  children: readonly WebsiteObservedNode[],
): boolean {
  const observation = availableObservation(node);
  const tagName = node.dom.tagName.toLowerCase();
  return (
    children.length > 0 &&
    node.links.length === 0 &&
    node.media.length === 0 &&
    node.textRuns.length === 0 &&
    (tagName === 'div' || tagName === 'span') &&
    observation !== null &&
    !hasLayoutRole(observation) &&
    !hasSurfaceRole(observation)
  );
}

/*** Maps observed DOM semantics and measured layout traits to already representable UI components. */
function recognizeComponentType(
  node: WebsiteObservedNode,
  parent: WebsiteObservedNode | null,
  childNodesByParent: ReadonlyMap<string, readonly WebsiteObservedNode[]>,
): string {
  const observation = availableObservation(node);
  if (observation === null) return 'Unknown';
  const tagName = node.dom.tagName.toLowerCase();
  const semanticType = recognizeWebsiteStructureSemanticComponentType(tagName);
  if (semanticType !== null) return semanticType;
  if (node.media.length > 0)
    return node.media.every((media) => media.kind === 'image') ? 'Image' : 'Media';
  if (node.links.length > 0) return 'Link';
  if (node.textRuns.length > 0) return 'RichText';
  if (isGroupedCard(node, parent, childNodesByParent)) return 'Card';
  const { css } = observation;
  if (css === null) return 'Unknown';
  if (css.display.includes('grid')) return 'Grid';
  if (css.display.includes('flex')) return 'Flex';
  return hasLayoutRole(observation) || hasSurfaceRole(observation) ? 'Container' : 'Unknown';
}

/*** Recognizes a card only when a measured sibling group shares explicit surface traits. */
function isGroupedCard(
  node: WebsiteObservedNode,
  parent: WebsiteObservedNode | null,
  childNodesByParent: ReadonlyMap<string, readonly WebsiteObservedNode[]>,
): boolean {
  if (parent === null || !isLayoutGroup(parent)) return false;
  const siblings = meaningfulChildren(parent.sourceRef, childNodesByParent);
  return siblings.length >= 2 && siblings.every(isCardSurface) && isCardSurface(node);
}

/*** Flattens transparent DOM wrappers before measuring the source siblings in a layout group. */
function meaningfulChildren(
  parentSourceRef: string,
  childNodesByParent: ReadonlyMap<string, readonly WebsiteObservedNode[]>,
): readonly WebsiteObservedNode[] {
  const children = childNodesByParent.get(parentSourceRef) ?? [];
  return children.flatMap((child) => {
    const nestedChildren = childNodesByParent.get(child.sourceRef) ?? [];
    return isTransparentWrapper(child, nestedChildren)
      ? meaningfulChildren(child.sourceRef, childNodesByParent)
      : [child];
  });
}

/*** Tests whether a parent has measured Grid or Flex grouping semantics. */
function isLayoutGroup(node: WebsiteObservedNode): boolean {
  const css = availableObservation(node)?.css;
  return css === null || css === undefined ? false : /grid|flex/.test(css.display);
}

/*** Requires padding plus radius, border, or shadow so colored columns are not invented as cards. */
function isCardSurface(node: WebsiteObservedNode): boolean {
  const observation = availableObservation(node);
  const css = observation?.css;
  return (
    css !== null &&
    css !== undefined &&
    hasNonZeroEdge(css.padding) &&
    (hasNonZeroCssValue(css.borderRadius) ||
      hasNonZeroCssValue(css.borderWidth) ||
      css.boxShadow !== 'none')
  );
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

/*** Recognizes the transparent computed color forms without assigning a color token. */
function isTransparentColor(value: string): boolean {
  return value === 'transparent' || value === 'rgba(0, 0, 0, 0)';
}

/*** Retains source-reference order while removing duplicate provenance from folded wrappers. */
function uniqueSourceRefs(sourceRefs: readonly string[]): readonly string[] {
  return [...new Set(sourceRefs)];
}
