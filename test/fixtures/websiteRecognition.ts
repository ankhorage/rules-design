import type {
  WebsiteComputedCss,
  WebsiteNodeObservation,
  WebsiteObservationDocument,
  WebsiteObservedNode,
} from '@ankhorage/contracts/website';

type Variant = 'static' | 'react' | 'elementor';
type Content = { readonly link?: boolean; readonly media?: boolean; readonly text?: string };

/*** Creates a complete portable observation document. */
export function createDocument(variant: Variant): WebsiteObservationDocument {
  return createDocumentWithNodes(createVariantNodes(variant));
}

/*** Creates three genuinely different DOM depths with equivalent visible content. */
function createVariantNodes(variant: Variant): readonly WebsiteObservedNode[] {
  const node = nodeFactory(variant);
  const content = (firstCard: string) => [
    node('heading', firstCard, 0, 'h2', observation('block'), { text: 'Welcome' }),
    node('paragraph', firstCard, 1, 'p', observation('block'), { text: 'Our ' }),
    node('span', `${variant}:paragraph`, 0, 'span', redObservation(), { text: 'red styled text' }),
    node('image', `${variant}:card:two`, 0, 'img', observation('block'), { media: true }),
    node('form', `${variant}:card:three`, 0, 'form', observation('block')),
    node('link', `${variant}:form`, 0, 'a', observation('inline'), {
      link: true,
      text: 'Contact us',
    }),
  ];
  const tail = [
    node('canvas', `${variant}:main`, 1, 'canvas', observation('block')),
    node('missing', `${variant}:main`, 2, 'div', missingObservation()),
  ];
  const staticNodes = [
    node('main', null, 0, 'main', observation('block')),
    node('grid', 'static:main', 0, 'div', observation('grid')),
    node('card:one', 'static:grid', 0, 'div', cardObservation()),
    node('card:two', 'static:grid', 1, 'div', cardObservation()),
    node('card:three', 'static:grid', 2, 'div', cardObservation()),
  ];
  const reactNodes = [
    node('main', null, 0, 'main', observation('block')),
    node('app', 'react:main', 0, 'div', observation('block')),
    node('grid', 'react:app', 0, 'div', observation('grid')),
    node('card:one:shell', 'react:grid', 0, 'div', observation('block')),
    node('card:one', 'react:card:one:shell', 0, 'div', cardObservation()),
    node('card:two', 'react:grid', 1, 'div', cardObservation()),
    node('card:three', 'react:grid', 2, 'div', cardObservation()),
  ];
  const elementorNodes = [
    node('main', null, 0, 'main', observation('block')),
    node('section', 'elementor:main', 0, 'div', observation('block')),
    node('container', 'elementor:section', 0, 'div', observation('block')),
    node('grid', 'elementor:container', 0, 'div', observation('grid')),
    node('column:one', 'elementor:grid', 0, 'div', observation('block')),
    node('card:one:inner', 'elementor:column:one', 0, 'div', observation('block')),
    node('card:one', 'elementor:card:one:inner', 0, 'div', cardObservation()),
    node('column:two', 'elementor:grid', 1, 'div', observation('block')),
    node('card:two', 'elementor:column:two', 0, 'div', cardObservation()),
    node('column:three', 'elementor:grid', 2, 'div', observation('block')),
    node('card:three', 'elementor:column:three', 0, 'div', cardObservation()),
  ];
  const nodes =
    variant === 'static' ? staticNodes : variant === 'react' ? reactNodes : elementorNodes;
  return [...nodes, ...content(`${variant}:card:one`), ...tail];
}

/*** Creates regression evidence for colored layout columns without card surfaces. */
export function createColoredColumnsDocument(): WebsiteObservationDocument {
  const node = nodeFactory('colored');
  return createDocumentWithNodes([
    node('main', null, 0, 'main', observation('block')),
    node('grid', 'colored:main', 0, 'div', observation('grid')),
    node('one', 'colored:grid', 0, 'div', coloredObservation()),
    node('two', 'colored:grid', 1, 'div', coloredObservation()),
    node('three', 'colored:grid', 2, 'div', coloredObservation()),
  ]);
}

/*** Creates invalid parent, cycle, and missing-observation evidence. */
export function createMalformedDocument(): WebsiteObservationDocument {
  const node = nodeFactory('malformed');
  return createDocumentWithNodes([
    node('invalid-parent', 'malformed:absent', 0, 'canvas', observation('block')),
    node('cycle:a', 'malformed:cycle:b', 0, 'div', observation('block')),
    node('cycle:b', 'malformed:cycle:a', 0, 'div', observation('block')),
    node('missing', null, 1, 'div', missingObservation()),
  ]);
}

/*** Wraps fixture nodes in the website observation contract. */
function createDocumentWithNodes(
  nodes: readonly WebsiteObservedNode[],
): WebsiteObservationDocument {
  return {
    collectedAt: '2026-11-11T18:00:00.000Z',
    documentId: 'crawl:fixture',
    pages: [
      {
        assets: [],
        id: 'home',
        navigation: [],
        nodes,
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

/*** Builds nodes with variant-specific stable source identities. */
function nodeFactory(variant: string) {
  return (
    name: string,
    parentSourceRef: string | null,
    childIndex: number,
    tagName: string,
    observed: WebsiteNodeObservation,
    content: Content = {},
  ): WebsiteObservedNode => {
    const sourceRef = `${variant}:${name}`;
    return {
      ancestorSourceRefs: [],
      dom: { attributes: { 'data-source': sourceRef }, childIndex, tagName },
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
      observations: [observed],
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
  };
}

/*** Lists observed source references in captured order. */
export function sourceRefsFor(document: WebsiteObservationDocument): readonly string[] {
  return document.pages[0]!.nodes.map((node) => node.sourceRef);
}

/*** Creates available observation evidence. */
function observation(display: string): WebsiteNodeObservation {
  return {
    availability: { missing: null, status: 'available' },
    css: { ...css, display },
    provenance,
    rect: { height: 100, width: 300, x: 0, y: 0 },
    stateId: 'default',
    viewportId: 'desktop',
  };
}

/*** Creates card-surface evidence. */
function cardObservation(): WebsiteNodeObservation {
  return { ...observation('block'), css: { ...css, borderRadius: '12px', padding: edges('24px') } };
}

/*** Creates colored but non-card evidence. */
function coloredObservation(): WebsiteNodeObservation {
  return { ...observation('block'), css: { ...css, backgroundColor: 'rgb(255, 0, 0)' } };
}

/*** Creates red inline text evidence. */
function redObservation(): WebsiteNodeObservation {
  return { ...observation('inline'), css: { ...css, color: 'rgb(255, 0, 0)', display: 'inline' } };
}

/*** Creates explicit unavailable observation evidence. */
function missingObservation(): WebsiteNodeObservation {
  return {
    availability: {
      missing: { code: 'not-rendered', message: 'The node was not rendered.' },
      status: 'missing',
    },
    css: null,
    provenance,
    rect: null,
    stateId: 'default',
    viewportId: 'desktop',
  };
}

/*** Reuses exact box-edge literals. */
function edges(value: string) {
  return { bottom: value, left: value, right: value, top: value };
}

const provenance = {
  capturedAt: '2026-11-11T18:00:00.000Z',
  method: 'browser' as const,
  sourceUrl: 'https://example.test/',
};
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
