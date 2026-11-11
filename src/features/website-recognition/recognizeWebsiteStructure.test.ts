import type { UiNode } from '@ankhorage/contracts';
import type {
  WebsiteComputedCss,
  WebsiteNodeObservation,
  WebsiteObservationDocument,
  WebsiteObservedNode,
} from '@ankhorage/contracts/website';
import { expect, test } from 'bun:test';

import { recognizeWebsiteStructure } from './recognizeWebsiteStructure.ts';

test('recognizes equivalent static, React-like, and Elementor-like source trees deterministically', () => {
  const recognizedVariants = ['static', 'react', 'elementor'].map((variant) =>
    recognizeWebsiteStructure(createDocument(variant)),
  );
  const componentTypes = recognizedVariants.map((pages) => flattenTypes(pages[0]?.root));

  expect(componentTypes).toEqual([componentTypes[0], componentTypes[0], componentTypes[0]]);
  expect(componentTypes[0]).toEqual([
    'Container',
    'Container',
    'Grid',
    'Card',
    'Heading',
    'RichText',
    'RichText',
    'Card',
    'Image',
    'Card',
    'Form',
    'Link',
    'Unknown',
    'Unknown',
  ]);
  expect(recognizedVariants[0]).toEqual(recognizeWebsiteStructure(createDocument('static')));
});

test('keeps source lineage, nested text runs, links, media, and unresolved observations', () => {
  const [page] = recognizeWebsiteStructure(createDocument('static'));
  const card = page.nodes.find((node) => node.id === 'home:card:one');
  const span = page.nodes.find((node) => node.id === 'home:span');
  const image = page.nodes.find((node) => node.id === 'home:image');
  const unresolved = page.nodes.find((node) => node.id === 'home:canvas');
  const missing = page.nodes.find((node) => node.id === 'home:missing');

  expect(card?.sourceRefs).toEqual(['home:wrapper', 'home:card:one']);
  expect(span).toMatchObject({
    componentType: 'RichText',
    props: [
      {
        name: 'textRuns',
        value: [{ end: 15, sourceRef: 'home:span:text', start: 0, text: 'red styled text' }],
      },
    ],
  });
  expect(image).toMatchObject({
    componentType: 'Image',
    props: [
      {
        name: 'media',
        value: [
          {
            alt: 'A team at work',
            assetId: 'asset:team',
            kind: 'image',
            sourceRef: 'home:image:media',
            url: 'https://example.test/team.jpg',
          },
        ],
      },
    ],
  });
  expect(unresolved).toMatchObject({
    status: 'unresolved',
    unresolved: { sourceRefs: ['home:canvas'] },
  });
  expect(missing).toMatchObject({
    status: 'unresolved',
    unresolved: { reason: 'No available rendered observation exists for this source node.' },
  });
});

/*** Creates equivalent source variants that differ only in non-semantic DOM attributes. */
function createDocument(variant: string): WebsiteObservationDocument {
  return {
    collectedAt: '2026-11-11T18:00:00.000Z',
    documentId: 'crawl:fixture',
    pages: [
      {
        assets: [],
        id: 'home',
        navigation: [],
        nodes: createNodes(variant),
        path: '/',
        states: [{ id: 'default', name: 'default' }],
        url: 'https://example.test/',
        viewports: [{ devicePixelRatio: 1, height: 900, id: 'desktop', width: 1440 }],
      },
    ],
    schemaVersion: 1,
    site: { id: 'example.test', url: 'https://example.test/' },
    source: {
      crawlId: 'crawl-fixture',
      crawlerId: 'fixture',
      crawlerVersion: '1.0.0',
      revision: 'sha256:fixture',
    },
  };
}

/*** Creates the representative DOM nodes for every semantically equivalent source variant. */
function createNodes(variant: string): readonly WebsiteObservedNode[] {
  return [
    observedNode('home:main', null, 0, 'main', variant, layoutObservation('block')),
    observedNode('home:grid', 'home:main', 0, 'div', variant, layoutObservation('grid')),
    observedNode('home:wrapper', 'home:grid', 0, 'div', variant, layoutObservation('block')),
    observedNode('home:card:one', 'home:wrapper', 0, 'div', variant, cardObservation()),
    observedNode('home:heading', 'home:card:one', 0, 'h2', variant, layoutObservation('block'), {
      text: 'Welcome',
    }),
    observedNode('home:paragraph', 'home:card:one', 1, 'p', variant, layoutObservation('block'), {
      text: 'Our ',
    }),
    observedNode('home:span', 'home:paragraph', 0, 'span', variant, layoutObservation('inline'), {
      text: 'red styled text',
    }),
    observedNode('home:card:two', 'home:grid', 1, 'div', variant, cardObservation()),
    observedNode('home:image', 'home:card:two', 0, 'img', variant, layoutObservation('block'), {
      media: true,
    }),
    observedNode('home:card:three', 'home:grid', 2, 'div', variant, cardObservation()),
    observedNode('home:form', 'home:card:three', 0, 'form', variant, layoutObservation('block')),
    observedNode('home:link', 'home:form', 0, 'a', variant, layoutObservation('inline'), {
      link: true,
      text: 'Contact us',
    }),
    observedNode('home:canvas', 'home:main', 1, 'canvas', variant, layoutObservation('block')),
    observedNode('home:missing', 'home:main', 2, 'div', variant, missingObservation()),
  ];
}

/*** Builds one source node with optional textual, linked, or media evidence. */
function observedNode(
  sourceRef: string,
  parentSourceRef: string | null,
  childIndex: number,
  tagName: string,
  variant: string,
  observation: WebsiteNodeObservation,
  content: { readonly link?: boolean; readonly media?: boolean; readonly text?: string } = {},
): WebsiteObservedNode {
  return {
    ancestorSourceRefs: [],
    dom: { attributes: { class: `${variant}-node` }, childIndex, tagName },
    links: content.link
      ? [
          {
            label: content.text ?? null,
            sourceRef: `${sourceRef}:link`,
            url: 'https://example.test/contact',
          },
        ]
      : [],
    media: content.media
      ? [
          {
            alt: 'A team at work',
            assetId: 'asset:team',
            kind: 'image',
            sourceRef: `${sourceRef}:media`,
            url: 'https://example.test/team.jpg',
          },
        ]
      : [],
    observations: [observation],
    parentSourceRef,
    sourceRef,
    textRuns:
      content.text === undefined
        ? []
        : [
            {
              end: content.text.length,
              sourceRef: `${sourceRef}:text`,
              start: 0,
              text: content.text,
            },
          ],
  };
}

/*** Creates a complete available observation with only the display and card traits varied. */
function layoutObservation(display: string): WebsiteNodeObservation {
  return {
    availability: { missing: null, status: 'available' },
    css: { ...css, display },
    provenance: {
      capturedAt: '2026-11-11T18:00:00.000Z',
      method: 'browser',
      sourceUrl: 'https://example.test/',
    },
    rect: { height: 100, width: 300, x: 0, y: 0 },
    stateId: 'default',
    viewportId: 'desktop',
  };
}

/*** Creates a measured card surface with padding and radius shared by its layout siblings. */
function cardObservation(): WebsiteNodeObservation {
  return {
    ...layoutObservation('block'),
    css: { ...css, borderRadius: '12px', display: 'block', padding: edges('24px') },
  };
}

/*** Makes missing evidence explicit rather than substituting a usable computed style. */
function missingObservation(): WebsiteNodeObservation {
  return {
    availability: {
      missing: { code: 'not-rendered', message: 'The node was not rendered.' },
      status: 'missing',
    },
    css: null,
    provenance: {
      capturedAt: '2026-11-11T18:00:00.000Z',
      method: 'browser',
      sourceUrl: 'https://example.test/',
    },
    rect: null,
    stateId: 'default',
    viewportId: 'desktop',
  };
}

/*** Flattens a recognized UI tree to make semantic hierarchy assertions compact and readable. */
function flattenTypes(node: UiNode | undefined): readonly string[] {
  if (node === undefined) return [];
  return [node.type, ...(node.children ?? []).flatMap(flattenTypes)];
}

/*** Reuses exact box-edge literals while varying only the evidence relevant to a test. */
function edges(value: string) {
  return { bottom: value, left: value, right: value, top: value };
}

const css: WebsiteComputedCss = {
  alignContent: 'normal',
  alignItems: 'normal',
  alignSelf: 'auto',
  backgroundColor: 'rgba(0, 0, 0, 0)',
  backgroundImage: 'none',
  backgroundPosition: '0% 0%',
  backgroundRepeat: 'repeat',
  backgroundSize: 'auto',
  borderColor: 'rgb(0, 0, 0)',
  borderRadius: '0px',
  borderWidth: '0px',
  boxShadow: 'none',
  color: 'rgb(0, 0, 0)',
  display: 'block',
  flexBasis: 'auto',
  flexDirection: 'row',
  flexGrow: '0',
  flexShrink: '1',
  flexWrap: 'nowrap',
  fontFamily: 'Inter',
  fontSize: '16px',
  fontStyle: 'normal',
  fontWeight: '400',
  gap: 'normal',
  gridAutoColumns: 'auto',
  gridAutoFlow: 'row',
  gridAutoRows: 'auto',
  gridColumn: 'auto',
  gridColumnEnd: 'auto',
  gridColumnStart: 'auto',
  gridRow: 'auto',
  gridRowEnd: 'auto',
  gridRowStart: 'auto',
  gridTemplateColumns: 'none',
  gridTemplateRows: 'none',
  justifyContent: 'normal',
  justifyItems: 'normal',
  justifySelf: 'auto',
  letterSpacing: '0px',
  lineHeight: '24px',
  margin: edges('0px'),
  opacity: '1',
  order: '0',
  overflow: 'visible',
  overflowX: 'visible',
  overflowY: 'visible',
  padding: edges('0px'),
  placeContent: 'normal',
  placeItems: 'normal',
  placeSelf: 'auto',
  position: 'static',
  textAlign: 'start',
  textDecoration: 'none',
  visibility: 'visible',
};
