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
  WebsiteDesignUnresolvedObservation,
} from '../../types/websiteDesignRecognition';
import { recognizeWebsiteAnimationEvidence } from './recognizeWebsiteAnimationEvidence';
import { tokenCandidates } from './tokenCandidates';

/*** Recognizes exact design properties from validated website observations without evaluating them. */
export function recognizeWebsiteDesignProperties(
  document: WebsiteObservationDocument,
): WebsiteDesignRecognition {
  const nodes = document.pages.flatMap((page) =>
    page.nodes.map((node) => recognizeNode(page.id, node)),
  );
  return { nodes, tokenCandidates: tokenCandidates(nodes) };
}

type CssProperty = keyof WebsiteComputedCss;

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
function recognizeNode(pageId: string, node: WebsiteObservedNode): WebsiteDesignNodeRecognition {
  const animation = recognizeWebsiteAnimationEvidence(pageId, node);
  return {
    sourceRef: node.sourceRef,
    pageId,
    colors: cssObservations(pageId, node, colorProperties),
    typography: cssObservations(pageId, node, typographyProperties),
    layout: cssObservations(pageId, node, layoutProperties),
    responsive: responsiveObservations(pageId, node),
    accessibility: accessibilityObservations(pageId, node),
    animation: animation.observations,
    media: node.media,
    unresolved: [...unresolvedObservations(pageId, node), ...animation.unresolved],
  };
}

/*** Projects exact available computed CSS values while retaining viewport, state, and provenance. */
function cssObservations(
  pageId: string,
  node: WebsiteObservedNode,
  properties: readonly CssProperty[],
): readonly WebsiteDesignPropertyObservation[] {
  return node.observations.flatMap((observation) => {
    const { css } = observation;
    return observation.availability.status === 'available' && css !== null
      ? properties.map((name) => cssObservation(pageId, node.sourceRef, observation, css, name))
      : [];
  });
}

/*** Creates one source-linked computed CSS observation without normalizing its original literal. */
function cssObservation(
  pageId: string,
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
    pageId,
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
  pageId: string,
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
    pageId,
    provenance: observation.provenance,
  }));
}

/*** Retains semantic and accessible-name evidence without producing accessibility conclusions. */
function accessibilityObservations(
  pageId: string,
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
    pageId,
    provenance: observation.provenance,
  }));
}

/*** Records unavailable CSS or geometry samples with their producer-supplied missing reason. */
function unresolvedObservations(
  pageId: string,
  node: WebsiteObservedNode,
): readonly WebsiteDesignUnresolvedObservation[] {
  return node.observations.flatMap((observation) => {
    return [...unavailableObservationKinds(pageId, node.sourceRef, observation)];
  });
}

/*** Maps a missing top-level observation to its unavailable channels while retaining the reason. */
function unavailableObservationKinds(
  pageId: string,
  sourceRef: string,
  observation: WebsiteNodeObservation,
): readonly WebsiteDesignUnresolvedObservation[] {
  const { availability } = observation;
  const { missing } = availability;
  if (availability.status !== 'missing' || missing === null) return [];
  return unresolvedObservationKinds(observation).map((kind) => ({
    kind,
    missing,
    pageId,
    provenance: observation.provenance,
    sourceRef,
    stateId: observation.stateId,
    viewportId: observation.viewportId,
  }));
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
