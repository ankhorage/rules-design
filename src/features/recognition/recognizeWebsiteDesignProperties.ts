import type {
  WebsiteComputedCss,
  WebsiteNodeObservation,
  WebsiteObservationDocument,
  WebsiteObservedNode,
} from '@ankhorage/contracts/website';
import { isRecord } from '@ankhorage/utility/object';

import type {
  WebsiteDesignNodeRecognition,
  WebsiteDesignPropertyObservation,
  WebsiteDesignRecognition,
  WebsiteDesignTokenCandidate,
  WebsiteDesignUnresolvedObservation,
} from '../../types/websiteDesignRecognition';

/*** Recognizes exact design properties from validated website observations without evaluating them. */
export function recognizeWebsiteDesignProperties(
  document: WebsiteObservationDocument,
): WebsiteDesignRecognition {
  const nodes = document.pages.flatMap((page) => page.nodes.map(recognizeNode));
  return { nodes, tokenCandidates: tokenCandidates(nodes) };
}

type CssProperty = keyof WebsiteComputedCss;
type TokenKind = WebsiteDesignTokenCandidate['kind'];

const colorProperties = ['color', 'backgroundColor', 'borderColor', 'opacity'] as const;
const typographyProperties = [
  'fontFamily',
  'fontSize',
  'fontStyle',
  'fontWeight',
  'letterSpacing',
  'lineHeight',
  'textAlign',
  'textDecoration',
] as const;
const layoutProperties = [
  'display',
  'position',
  'visibility',
  'borderRadius',
  'borderWidth',
  'boxShadow',
  'margin',
  'padding',
  'alignContent',
  'alignItems',
  'alignSelf',
  'gap',
  'flexDirection',
  'flexBasis',
  'flexGrow',
  'flexShrink',
  'flexWrap',
  'justifyContent',
  'justifyItems',
  'justifySelf',
  'order',
  'placeContent',
  'placeItems',
  'placeSelf',
  'gridAutoColumns',
  'gridAutoFlow',
  'gridAutoRows',
  'gridColumn',
  'gridColumnEnd',
  'gridColumnStart',
  'gridRow',
  'gridRowEnd',
  'gridRowStart',
  'gridTemplateColumns',
  'gridTemplateRows',
  'overflow',
  'overflowX',
  'overflowY',
  'backgroundImage',
  'backgroundPosition',
  'backgroundRepeat',
  'backgroundSize',
] as const;

/*** Retains every available node style and safe semantic observation at its source identity. */
function recognizeNode(node: WebsiteObservedNode): WebsiteDesignNodeRecognition {
  return {
    sourceRef: node.sourceRef,
    colors: cssObservations(node, colorProperties),
    typography: cssObservations(node, typographyProperties),
    layout: cssObservations(node, layoutProperties),
    responsive: responsiveObservations(node),
    accessibility: accessibilityObservations(node),
    media: node.media,
    unresolved: unresolvedObservations(node),
  };
}

/*** Projects exact available computed CSS values while retaining viewport, state, and provenance. */
function cssObservations(
  node: WebsiteObservedNode,
  properties: readonly CssProperty[],
): readonly WebsiteDesignPropertyObservation[] {
  return node.observations.flatMap((observation) => {
    const { css } = observation;
    return observation.availability.status === 'available' && css !== null
      ? properties.map((name) => cssObservation(node.sourceRef, observation, css, name))
      : [];
  });
}

/*** Creates one source-linked computed CSS observation without normalizing its original literal. */
function cssObservation(
  sourceRef: string,
  observation: WebsiteNodeObservation,
  css: WebsiteComputedCss,
  name: CssProperty,
): WebsiteDesignPropertyObservation {
  return {
    name,
    value: cssValue(cssPropertyValue(css, name)),
    viewportId: observation.viewportId,
    stateId: observation.stateId,
    sourceRef,
    provenance: observation.provenance,
  };
}

/*** Reads a named computed CSS field without indexing an untrusted external object. */
function cssPropertyValue(css: WebsiteComputedCss, name: CssProperty): unknown {
  const value = Object.entries(isRecord(css) ? css : {}).find(
    ([property]) => property === name,
  )?.[1];
  if (value === undefined) throw new TypeError(`Unknown computed CSS property: ${name}`);
  return value;
}

/*** Converts the one structured CSS box value into a portable serializable value. */
function cssValue(value: unknown) {
  if (typeof value === 'string') return value;
  if (
    isRecord(value) &&
    typeof value.bottom === 'string' &&
    typeof value.left === 'string' &&
    typeof value.right === 'string' &&
    typeof value.top === 'string'
  )
    return { bottom: value.bottom, left: value.left, right: value.right, top: value.top };
  throw new TypeError('Computed CSS values must be strings or complete box edges.');
}

/*** Retains responsive geometry and CSS state samples without inventing source-authored breakpoints. */
function responsiveObservations(
  node: WebsiteObservedNode,
): readonly WebsiteDesignPropertyObservation[] {
  return node.observations.map((observation) => ({
    name: 'observation',
    value: {
      availability: observation.availability.status,
      rect:
        observation.rect === null
          ? null
          : {
              height: observation.rect.height,
              width: observation.rect.width,
              x: observation.rect.x,
              y: observation.rect.y,
            },
    },
    viewportId: observation.viewportId,
    stateId: observation.stateId,
    sourceRef: node.sourceRef,
    provenance: observation.provenance,
  }));
}

/*** Retains semantic and accessible-name evidence without producing accessibility conclusions. */
function accessibilityObservations(
  node: WebsiteObservedNode,
): readonly WebsiteDesignPropertyObservation[] {
  const { sourceRef } = node;
  const semantic = {
    attributes: node.dom.attributes,
    links: node.links.map((link) => ({
      label: link.label,
      sourceRef: link.sourceRef,
      url: link.url,
    })),
    tagName: node.dom.tagName,
    textRuns: node.textRuns.map((textRun) => ({
      end: textRun.end,
      sourceRef: textRun.sourceRef,
      start: textRun.start,
      text: textRun.text,
    })),
  };
  return node.observations.map((observation) => ({
    name: 'semantics',
    value: semantic,
    viewportId: observation.viewportId,
    stateId: observation.stateId,
    sourceRef,
    provenance: observation.provenance,
  }));
}

/*** Records unavailable CSS or geometry samples with their producer-supplied missing reason. */
function unresolvedObservations(
  node: WebsiteObservedNode,
): readonly WebsiteDesignUnresolvedObservation[] {
  return node.observations.flatMap((observation) => {
    const { availability } = observation;
    if (availability.status !== 'missing' || availability.missing === null) return [];
    const { missing } = availability;
    return unresolvedObservationKinds(observation).map((kind) => ({
      kind,
      missing,
      provenance: observation.provenance,
      sourceRef: node.sourceRef,
      stateId: observation.stateId,
      viewportId: observation.viewportId,
    }));
  });
}

/*** Distinguishes each unavailable evidence channel without pretending it was observed. */
function unresolvedObservationKinds(
  observation: WebsiteNodeObservation,
): readonly WebsiteDesignUnresolvedObservation['kind'][] {
  return [
    ...(observation.css === null ? (['computed-css'] as const) : []),
    ...(observation.rect === null ? (['geometry'] as const) : []),
  ];
}

/*** Finds repeated exact design literals and records them as role-free reusable token candidates. */
function tokenCandidates(
  nodes: readonly WebsiteDesignNodeRecognition[],
): readonly WebsiteDesignTokenCandidate[] {
  return tokenKinds.flatMap((kind) => candidatesForKind(nodes, kind));
}

const tokenKinds: readonly TokenKind[] = ['color', 'radius', 'shadow', 'spacing', 'typography'];

/*** Extracts deterministic repeated candidates for one design-token family. */
function candidatesForKind(
  nodes: readonly WebsiteDesignNodeRecognition[],
  kind: TokenKind,
): readonly WebsiteDesignTokenCandidate[] {
  const observations = nodes.flatMap((node) => observationsForKind(node, kind));
  const stringObservations = observations.filter(
    (observation): observation is WebsiteDesignPropertyObservation & { readonly value: string } =>
      typeof observation.value === 'string',
  );
  return [...Map.groupBy(stringObservations, (observation) => observation.value).entries()]
    .filter(([, values]) => sourceRefs(values).length > 1)
    .map(([value, values]) => ({
      kind,
      value,
      originalValues: [...new Set(values.map((item) => item.value))],
      sourceRefs: sourceRefs(values),
      confidence: sourceRefs(values).length / sourceRefs(observations).length,
      inferredRole: null,
    }))
    .toSorted((left, right) => left.value.localeCompare(right.value));
}

/*** Extracts deterministic unique source identities so viewport samples do not fabricate repetition. */
function sourceRefs(observations: readonly WebsiteDesignPropertyObservation[]): readonly string[] {
  return [...new Set(observations.map((observation) => observation.sourceRef))].toSorted();
}

/*** Selects only the observations that belong to one factual token family. */
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
