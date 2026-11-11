import type { UiNode } from '@ankhorage/contracts';
import type { WebsiteObservedNode, WebsiteRecognizedProp } from '@ankhorage/contracts/website';

import type { RecognizedTreeNode } from './recognizeWebsiteStructure';

/*** Creates a recognized tree node and retains all descendant source mappings. */
export function createWebsiteStructureTreeNode(
  node: WebsiteObservedNode,
  componentType: string,
  sourceRefs: readonly string[],
  props: readonly WebsiteRecognizedProp[],
  children: readonly RecognizedTreeNode[],
  unresolvedReason: string,
): RecognizedTreeNode {
  const unresolved = componentType === 'Unknown';
  const recognizedNode = {
    componentType,
    confidence: unresolved ? 0 : confidenceFor(componentType),
    id: node.sourceRef,
    props,
    responsive: [],
    sourceRefs,
    status: unresolved ? 'unresolved' : 'recognized',
    unresolved: unresolved ? { reason: unresolvedReason, sourceRefs } : null,
  } as const;
  return {
    node: recognizedNode,
    nodes: [recognizedNode, ...children.flatMap((child) => child.nodes)],
    uiNode: createWebsiteStructureUiNode(node.sourceRef, componentType, props, children),
  };
}

/*** Creates a stable source-derived UI node with ordered recognized children. */
function createWebsiteStructureUiNode(
  id: string,
  componentType: string,
  props: readonly WebsiteRecognizedProp[],
  children: readonly RecognizedTreeNode[],
): UiNode {
  const uiProps = Object.fromEntries(props.map((prop) => [prop.name, prop.value]));
  return {
    ...(children.length === 0 ? {} : { children: children.map((child) => child.uiNode) }),
    id,
    ...(props.length === 0 ? {} : { props: uiProps }),
    type: componentType,
  };
}

/*** Creates an explicit unresolved mapping for malformed cyclic source hierarchy. */
export function createWebsiteStructureUnresolvedTreeNode(
  node: WebsiteObservedNode,
  sourceRefs: readonly string[],
  reason: string,
): RecognizedTreeNode {
  const unresolvedNode = {
    componentType: 'Unknown',
    confidence: 0,
    id: node.sourceRef,
    props: [],
    responsive: [],
    sourceRefs: uniqueSourceRefs([...sourceRefs, node.sourceRef]),
    status: 'unresolved',
    unresolved: { reason, sourceRefs: uniqueSourceRefs([...sourceRefs, node.sourceRef]) },
  } as const;
  return {
    node: unresolvedNode,
    nodes: [unresolvedNode],
    uiNode: { id: node.sourceRef, type: 'Unknown' },
  };
}

/*** Assigns bounded confidence from the evidence class rather than an aesthetic assessment. */
function confidenceFor(componentType: string): number {
  if (componentType === 'Grid' || componentType === 'Flex') return 0.98;
  if (componentType === 'Card') return 0.9;
  if (componentType === 'Container') return 0.8;
  return 1;
}

/*** Retains source-reference order while removing duplicate provenance from folded wrappers. */
function uniqueSourceRefs(sourceRefs: readonly string[]): readonly string[] {
  return [...new Set(sourceRefs)];
}
