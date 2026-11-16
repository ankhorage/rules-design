import type { UiNode } from '@ankhorage/contracts';
import type {
  WebsiteObservationDocument,
  WebsiteObservedNode,
  WebsitePageObservation,
  WebsitePageRecognition,
  WebsiteRecognizedNode,
} from '@ankhorage/contracts/website';

import { recognizeWebsiteStructureProps } from './recognizeWebsiteStructureProps';
import { websiteStructureEvidence } from './websiteStructureEvidence';
import { recognizeWebsiteStructureSemanticComponentType } from './websiteStructureSemantics';
import { createWebsiteStructureTreeNode } from './websiteStructureTreeNodes';
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
  const allRecognitions = page.nodes.reduce(
    (recognitions, node) =>
      containsSourceRef(recognitions, node.sourceRef)
        ? recognitions
        : [
            ...recognitions,
            ...recognizeTreeNode(node, nodesBySourceRef, childNodesByParent, null, [], []),
          ],
    recognizedNodes,
  );

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
    return [];
  }
  const children = childNodesByParent.get(node.sourceRef) ?? [];
  if (
    !isCyclicSourceRef(node, nodesBySourceRef) &&
    websiteStructureEvidence(node, children).isTransparentWrapper
  ) {
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
      nodesBySourceRef,
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
  nodesBySourceRef: ReadonlyMap<string, WebsiteObservedNode>,
  inheritedSourceRefs: readonly string[],
  children: readonly RecognizedTreeNode[],
): RecognizedTreeNode {
  const cyclic = isCyclicSourceRef(node, nodesBySourceRef);
  const componentType = cyclic
    ? 'Unknown'
    : recognizeComponentType(node, parent, childNodesByParent);
  const props = recognizeWebsiteStructureProps(node);
  return createWebsiteStructureTreeNode(
    node,
    componentType,
    [...inheritedSourceRefs, node.sourceRef],
    props,
    children,
    cyclic
      ? 'Source hierarchy contains a cycle.'
      : websiteStructureEvidence(node).availableObservation === null
        ? 'No available rendered observation exists for this source node.'
        : 'Visible source node has no canonical component mapping.',
  );
}

/*** Tests whether a source reference participates in a parent-reference cycle. */
function isCyclicSourceRef(
  node: WebsiteObservedNode,
  nodesBySourceRef: ReadonlyMap<string, WebsiteObservedNode>,
): boolean {
  const visitedSourceRefs = new Set<string>();
  let currentSourceRef: string | null = node.sourceRef;
  while (currentSourceRef !== null) {
    if (visitedSourceRefs.has(currentSourceRef)) return currentSourceRef === node.sourceRef;
    visitedSourceRefs.add(currentSourceRef);
    currentSourceRef = nodesBySourceRef.get(currentSourceRef)?.parentSourceRef ?? null;
  }
  return false;
}

/*** Tests whether already emitted recognitions retain a source reference. */
function containsSourceRef(
  recognitions: readonly RecognizedTreeNode[],
  sourceRef: string,
): boolean {
  return recognitions.some((recognition) =>
    recognition.nodes.some((node) => node.sourceRefs.includes(sourceRef)),
  );
}

/*** Maps observed DOM semantics and measured layout traits to already representable UI components. */
function recognizeComponentType(
  node: WebsiteObservedNode,
  parent: WebsiteObservedNode | null,
  childNodesByParent: ReadonlyMap<string, readonly WebsiteObservedNode[]>,
): string {
  const observation = websiteStructureEvidence(node).availableObservation;
  if (observation === null) return 'Unknown';
  const tagName = node.dom.tagName.toLowerCase();
  const semanticType = recognizeWebsiteStructureSemanticComponentType(tagName);
  if (semanticType !== null) return semanticType;
  const { css } = observation;
  if (css === null) return 'Unknown';
  if (isGroupedCard(node, parent, childNodesByParent)) return 'Card';
  if (css.display.includes('grid')) return 'Grid';
  if (css.display.includes('flex')) return 'Flex';
  if (node.media.length > 0)
    return node.media.every((media) => media.kind === 'image') ? 'Image' : 'Media';
  if (node.links.length > 0) return 'Link';
  if (node.textRuns.length > 0) return 'RichText';
  return websiteStructureEvidence(node).hasVisualRole ? 'Container' : 'Unknown';
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
    return websiteStructureEvidence(child, nestedChildren).isTransparentWrapper
      ? meaningfulChildren(child.sourceRef, childNodesByParent)
      : [child];
  });
}

/*** Tests whether a parent has measured Grid or Flex grouping semantics. */
function isLayoutGroup(node: WebsiteObservedNode): boolean {
  const css = websiteStructureEvidence(node).availableObservation?.css;
  return css === null || css === undefined ? false : /grid|flex/.test(css.display);
}

/*** Requires padding plus radius, border, or shadow so colored columns are not invented as cards. */
function isCardSurface(node: WebsiteObservedNode): boolean {
  return websiteStructureEvidence(node).hasCardSurface;
}
