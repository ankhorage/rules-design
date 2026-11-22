import type { UiNode } from '@ankhorage/contracts';
import type {
  WebsiteObservationDocument,
  WebsiteObservedNode,
  WebsitePageRecognition,
  WebsiteRecognitionDocument,
  WebsiteSiteChromeCandidate,
  WebsiteSiteChromeSourceEvidence,
  WebsiteSiteChromeViewportObservation,
} from '@ankhorage/contracts/website';

/*** Recognizes page-grounded header and footer candidates without asserting cross-page identity. */
export function recognizeWebsiteSiteChrome(
  document: WebsiteObservationDocument,
  pages: readonly WebsitePageRecognition[],
): WebsiteRecognitionDocument['siteChrome'] {
  return {
    candidates: document.pages.flatMap((page) => {
      const recognition = pages.find((candidate) => candidate.id === page.id);
      if (recognition === undefined)
        throw new TypeError(`Missing recognition for page ${page.id}.`);
      const nodesBySourceRef = new Map(page.nodes.map((node) => [node.sourceRef, node]));
      return page.nodes.flatMap((node) => {
        const role = siteChromeRole(node);
        return role === null || hasSameRoleLandmarkAncestor(node, role, nodesBySourceRef)
          ? []
          : [createCandidate(page.id, node, role, nodesBySourceRef, recognition)];
      });
    }),
  };
}

type SiteChromeRole = 'footer' | 'header';

/*** Creates one source-specific candidate so later consumers, not this recognizer, compare pages. */
function createCandidate(
  pageId: string,
  node: WebsiteObservedNode,
  role: SiteChromeRole,
  nodesBySourceRef: ReadonlyMap<string, WebsiteObservedNode>,
  page: WebsitePageRecognition,
): WebsiteSiteChromeCandidate {
  const source = sourceEvidence(pageId, node, nodesBySourceRef);
  const subtree = subtreeFor(page, pageId, node.sourceRef);
  const local = hasLocalContentAncestor(
    node,
    nodesBySourceRef,
    page,
    pageId,
    hasExplicitLandmarkRole(node),
  );
  const uncertainty = node.observations.flatMap((observation) =>
    observation.availability.status === 'missing' && observation.availability.missing !== null
      ? [observation.availability.missing]
      : [],
  );
  return {
    classification: local ? 'page-local' : 'site-candidate',
    confidence: local ? 0.5 : 0.9,
    id: JSON.stringify([role, pageId, node.sourceRef]),
    memberships: [
      {
        pageId,
        source,
        state: hasConditionalObservation(node) ? 'variant' : 'present',
        subtree,
      },
    ],
    role,
    uncertainty,
  };
}

/*** Identifies HTML landmarks unless an explicit ARIA role overrides their ownership. */
function siteChromeRole(node: WebsiteObservedNode): SiteChromeRole | null {
  if (Object.hasOwn(node.dom.attributes, 'role')) return landmarkRoleFor(node.dom.attributes.role);
  const observedRole = node.observations
    .map((observation) => observation.semanticAttributes?.role)
    .find((role): role is string => typeof role === 'string');
  if (observedRole !== undefined) return landmarkRoleFor(observedRole);
  const tagName = node.dom.tagName.toLowerCase();
  if (tagName === 'header' || tagName === 'footer') return tagName;
  return null;
}

/*** Maps only ARIA landmark roles that own site chrome. */
function landmarkRoleFor(role: unknown): SiteChromeRole | null {
  if (role === 'banner') return 'header';
  if (role === 'contentinfo') return 'footer';
  return null;
}

/*** Distinguishes explicit ARIA landmark evidence from implicit HTML landmark semantics. */
function hasExplicitLandmarkRole(node: WebsiteObservedNode): boolean {
  return (
    landmarkRoleFor(node.dom.attributes.role) !== null ||
    node.observations.some(
      (observation) => landmarkRoleFor(observation.semanticAttributes?.role) !== null,
    )
  );
}

/*** Suppresses nested duplicates while retaining their UI descendants in the owning landmark subtree. */
function hasSameRoleLandmarkAncestor(
  node: WebsiteObservedNode,
  role: SiteChromeRole,
  nodesBySourceRef: ReadonlyMap<string, WebsiteObservedNode>,
): boolean {
  return ancestorNodes(node, nodesBySourceRef).some(
    (ancestor) => siteChromeRole(ancestor) === role,
  );
}

/*** Preserves raw DOM, landmark, and viewport evidence with page-qualified source identity. */
function sourceEvidence(
  pageId: string,
  node: WebsiteObservedNode,
  nodesBySourceRef: ReadonlyMap<string, WebsiteObservedNode>,
): WebsiteSiteChromeSourceEvidence {
  return {
    ancestorSourceRefs: ancestorSourceRefs(pageId, node, nodesBySourceRef),
    dom: node.dom,
    observations: node.observations.map((observation) => ({
      availability: observation.availability,
      ...(observation.semanticAttributes === undefined
        ? {}
        : { semanticAttributes: observation.semanticAttributes }),
      rect: observation.rect,
      stateId: observation.stateId,
      viewportId: observation.viewportId,
      visibility: visibilityOf(observation),
    })),
    parentSourceRef:
      node.parentSourceRef === null ? null : sourceIdentity(pageId, node.parentSourceRef),
    semantics: {
      ariaLabel: ariaLabel(node),
      role: semanticRole(node),
    },
    sourceRef: sourceIdentity(pageId, node.sourceRef),
  };
}

/*** Retains the first explicit DOM or viewport ARIA role without normalizing its literal. */
function semanticRole(node: WebsiteObservedNode): string | null {
  const roles = [
    Object.hasOwn(node.dom.attributes, 'role') ? node.dom.attributes.role : null,
    ...node.observations.map((observation) => observation.semanticAttributes?.role),
  ];
  return roles.find((role): role is string => typeof role === 'string') ?? null;
}

/*** Reads an accessible label from DOM or viewport-specific semantic evidence without fabrication. */
function ariaLabel(node: WebsiteObservedNode): string | null {
  const labels = [
    node.dom.attributes['aria-label'],
    ...node.observations.map((observation) => observation.semanticAttributes?.['aria-label']),
  ];
  return labels.find((label): label is string => typeof label === 'string') ?? null;
}

/*** Converts measured CSS visibility to the bounded portable visibility vocabulary. */
function visibilityOf(
  observation: WebsiteObservedNode['observations'][number],
): WebsiteSiteChromeViewportObservation['visibility'] {
  if (observation.availability.status !== 'available' || observation.css === null) return 'unknown';
  return observation.css.display === 'none' ||
    observation.css.visibility === 'hidden' ||
    observation.css.visibility === 'collapse' ||
    observation.css.opacity === '0'
    ? 'hidden'
    : 'visible';
}

/*** Classifies differing measured visibility or availability as a real responsive/state variant. */
function hasConditionalObservation(node: WebsiteObservedNode): boolean {
  const states = node.observations.map(
    (observation) => `${observation.availability.status}:${visibilityOf(observation)}`,
  );
  return new Set(states).size > 1;
}

/*** Finds content-owned ancestors from DOM lineage and canonical recognized card mappings. */
function hasLocalContentAncestor(
  node: WebsiteObservedNode,
  nodesBySourceRef: ReadonlyMap<string, WebsiteObservedNode>,
  page: WebsitePageRecognition,
  pageId: string,
  hasExplicitLandmark: boolean,
): boolean {
  return ancestorNodes(node, nodesBySourceRef).some((ancestor) => {
    const tagName = ancestor.dom.tagName.toLowerCase();
    const recognized = page.nodes.find(
      (candidate) => candidate.id === sourceIdentity(pageId, ancestor.sourceRef),
    );
    return (
      ['article', 'aside', 'main'].includes(tagName) ||
      (!hasExplicitLandmark && tagName === 'section') ||
      recognized?.componentType === 'Card'
    );
  });
}

/*** Traverses actual parent references with cycle protection instead of trusting optional ancestry hints. */
function ancestorNodes(
  node: WebsiteObservedNode,
  nodesBySourceRef: ReadonlyMap<string, WebsiteObservedNode>,
): readonly WebsiteObservedNode[] {
  const ancestors: WebsiteObservedNode[] = [];
  const seen = new Set<string>([node.sourceRef]);
  let { parentSourceRef } = node;
  while (parentSourceRef !== null && !seen.has(parentSourceRef)) {
    const parent = nodesBySourceRef.get(parentSourceRef);
    if (parent === undefined) break;
    ancestors.push(parent);
    seen.add(parent.sourceRef);
    const { parentSourceRef: nextParentSourceRef } = parent;
    parentSourceRef = nextParentSourceRef;
  }
  return ancestors;
}

/*** Qualifies ancestor references consistently with the public recognition document. */
function ancestorSourceRefs(
  pageId: string,
  node: WebsiteObservedNode,
  nodesBySourceRef: ReadonlyMap<string, WebsiteObservedNode>,
): readonly string[] {
  return ancestorNodes(node, nodesBySourceRef).map((ancestor) =>
    sourceIdentity(pageId, ancestor.sourceRef),
  );
}

/*** Retains the complete recursive UI subtree and its ordered recognized-node traversal. */
function subtreeFor(
  page: WebsitePageRecognition,
  pageId: string,
  sourceRef: string,
): WebsiteSiteChromeCandidate['memberships'][number]['subtree'] {
  const root = findUiNode(page.root, sourceIdentity(pageId, sourceRef));
  if (root === null) return null;
  const nodeIds = uiNodeIds(root);
  const nodesById = new Map(page.nodes.map((node) => [node.id, node]));
  const nodes = nodeIds.flatMap((id) => {
    const node = nodesById.get(id);
    return node === undefined ? [] : [node];
  });
  return { nodes, root };
}

/*** Locates a source-qualified UI node without flattening or recreating its child tree. */
function findUiNode(node: UiNode, id: string): UiNode | null {
  if (node.id === id) return node;
  for (const child of node.children ?? []) {
    const match = findUiNode(child, id);
    if (match !== null) return match;
  }
  return null;
}

/*** Enumerates a UI subtree in deterministic pre-order so node evidence matches tree order. */
function uiNodeIds(node: UiNode): readonly string[] {
  return [node.id, ...(node.children ?? []).flatMap(uiNodeIds)];
}

/*** Uses the established page-qualified source identity format for public provenance. */
function sourceIdentity(pageId: string, sourceRef: string): string {
  return JSON.stringify([pageId, sourceRef]);
}
