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
    node('grid', 'colored:main', 0, 'div', coloredObservation()),
    node('one', 'colored:grid', 0, 'div', coloredObservation()),
    node('two', 'colored:grid', 1, 'div', coloredObservation()),
    node('three', 'colored:grid', 2, 'div', coloredObservation()),
  ]);
}

/*** Creates nested layout, card, semantic, transparent-wrapper, and unknown-parent evidence. */
export function createComplexLayoutDocument(): WebsiteObservationDocument {
  const node = nodeFactory('complex');
  return createDocumentWithNodes([
    node('main', null, 0, 'main', observation('block')),
    node('nav', 'complex:main', 0, 'nav', observation('block')),
    node('nav-list', 'complex:nav', 0, 'ul', observation('flex')),
    node('nav-item', 'complex:nav-list', 0, 'li', observation('block')),
    node('nav-link', 'complex:nav-item', 0, 'a', observation('inline-flex'), {
      link: true,
      text: 'Work',
    }),
    node('grid', 'complex:main', 1, 'div', observation('grid'), { text: 'Grid label' }),
    node('card:one', 'complex:grid', 0, 'div', cardObservation(), { text: 'One' }),
    node('card:two', 'complex:grid', 1, 'div', cardObservation(), { link: true, text: 'Two' }),
    node('contents', 'complex:main', 2, 'div', contentsObservation()),
    node('heading', 'complex:contents', 0, 'h2', observation('block'), { text: 'Visible child' }),
    node('unknown', 'complex:main', 3, 'canvas', observation('block')),
    node('unknown-child', 'complex:unknown', 0, 'h3', observation('block'), { text: 'Kept child' }),
  ]);
}

/*** Creates a wrapper with one transparent observation and one missing observation. */
export function createIncompleteWrapperEvidenceDocument(): WebsiteObservationDocument {
  const node = nodeFactory('incomplete-wrapper');
  return createDocumentWithNodes([
    node('main', null, 0, 'main', observation('block')),
    {
      ...node('wrapper', 'incomplete-wrapper:main', 0, 'div', contentsObservation()),
      observations: [contentsObservation(), missingObservation()],
    },
    node('heading', 'incomplete-wrapper:wrapper', 0, 'h2', observation('block'), {
      text: 'Kept child',
    }),
  ]);
}

/*** Creates the three-viewport card and divider evidence used by the website recognition boundary. */
export function createVisibleCardAndDividerDocument(): WebsiteObservationDocument {
  const base = createDocument('static').pages[0]!.nodes[0]!;
  const node = cardFixtureNodeFactory(base);
  return withResponsiveViewports(
    createDocumentWithNodes([
      node('main', null, 0, 'main', { display: 'block' }),
      node('layout', 'surface:main', 0, 'div', {
        backgroundColor: 'rgb(255, 255, 255)',
        display: 'grid',
        rect: { height: 400, width: 1200, x: 0, y: 0 },
      }),
      node('marketing', 'surface:layout', 0, 'div', { backgroundColor: 'rgb(255, 221, 0)' }),
      node('design', 'surface:layout', 1, 'div', { borderWidth: '1px' }),
      node('wrapper', 'surface:layout', 2, 'div', {}),
      node('realization', 'surface:wrapper', 0, 'div', { boxShadow: '0 4px 12px rgb(0, 0, 0)' }),
      node('websites', 'surface:layout', 3, 'div', {
        backgroundColor: 'rgba(0, 90, 255, 0.8)',
        display: 'flex',
      }),
      node('marketing-heading', 'surface:marketing', 0, 'h3', {}, 'Marketing'),
      node('marketing-subtitle', 'surface:marketing', 1, 'span', {}, 'Strategy'),
      node('design-heading', 'surface:design', 0, 'h3', {}, 'Entwurf und Layout'),
      node('design-copy', 'surface:design', 1, 'p', {}, 'Design that lasts'),
      node('realization-heading', 'surface:realization', 0, 'h3', {}, 'Realisierung'),
      node('websites-heading', 'surface:websites', 0, 'h3', {}, 'Websites'),
      node('websites-copy', 'surface:websites', 1, 'span', {}, 'Responsive experiences'),
      node('divider', 'surface:main', 1, 'span', {
        backgroundColor: 'rgb(0, 0, 0)',
        rect: { height: 2, width: 96, x: 0, y: 620 },
      }),
    ]),
  );
}

/*** Creates positive and negative isolated surface cases without relying on sibling repetition. */
export function createCardAndDividerEvidenceDocument(): WebsiteObservationDocument {
  const base = createDocument('static').pages[0]!.nodes[0]!;
  const node = cardFixtureNodeFactory(base);
  return withResponsiveViewports(
    createDocumentWithNodes([
      node('main', null, 0, 'main', {}),
      node('layout', 'surface:main', 0, 'div', {
        backgroundColor: 'rgb(255, 255, 255)',
        display: 'grid',
        rect: { height: 400, width: 1200, x: 0, y: 0 },
      }),
      node('empty', 'surface:layout', 0, 'div', { backgroundColor: 'rgb(255, 221, 0)' }),
      node('image', 'surface:layout', 1, 'div', { backgroundImage: 'url("card.png")' }),
      node('radius-only', 'surface:layout', 2, 'div', { borderRadius: '12px' }),
      node('same-background', 'surface:layout', 3, 'div', {
        backgroundColor: 'rgb(255, 255, 255)',
      }),
      node('invisible-border', 'surface:layout', 4, 'div', {
        borderColor: 'rgba(0, 0, 0, 0)',
        borderWidth: '1px',
      }),
      node('hr', 'surface:main', 1, 'hr', {
        borderWidth: '1px',
        rect: { height: 1, width: 240, x: 0, y: 500 },
      }),
      node('aria', 'surface:main', 2, 'div', {
        backgroundColor: 'rgb(0, 0, 0)',
        rect: { height: 2, width: 240, x: 0, y: 520 },
        role: 'separator',
      }),
      node('divider-flex', 'surface:main', 3, 'div', { display: 'flex' }),
      node('css-line', 'surface:divider-flex', 0, 'span', {
        backgroundColor: 'rgb(0, 0, 0)',
        rect: { height: 2, width: 240, x: 0, y: 540 },
      }),
      node('section-border', 'surface:main', 4, 'div', { borderWidth: '1px' }),
      node('hidden-line', 'surface:main', 5, 'span', {
        backgroundColor: 'rgba(0, 0, 0, 0)',
        rect: { height: 2, width: 240, x: 0, y: 560 },
      }),
    ]),
  );
}

/*** Declares the observed desktop, tablet, and mobile viewports retained by the card fixture. */
function withResponsiveViewports(document: WebsiteObservationDocument): WebsiteObservationDocument {
  const [page] = document.pages;
  if (page === undefined) throw new Error('Expected one fixture page.');
  return {
    ...document,
    pages: [
      {
        ...page,
        viewports: [
          { devicePixelRatio: 1, height: 900, id: 'desktop', width: 1440 },
          { devicePixelRatio: 1, height: 1024, id: 'tablet', width: 768 },
          { devicePixelRatio: 1, height: 844, id: 'mobile', width: 390 },
        ],
      },
    ],
  };
}

/*** Builds source-linked fixture nodes with desktop, tablet, and mobile evidence. */
function cardFixtureNodeFactory(base: WebsiteObservedNode) {
  return (
    name: string,
    parent: string | null,
    childIndex: number,
    tagName: string,
    overrides: Partial<WebsiteComputedCss> & {
      readonly rect?: WebsiteNodeObservation['rect'];
      readonly role?: string;
    },
    text?: string,
  ): WebsiteObservedNode => {
    const sourceRef = `surface:${name}`;
    const rect = overrides.rect ?? { height: 160, width: 280, x: childIndex * 300, y: 0 };
    const { rect: _rect, role, ...cssOverrides } = overrides;
    return {
      ...base,
      dom: { attributes: role === undefined ? {} : { role }, childIndex, tagName },
      links: [],
      media: [],
      observations: cardFixtureObservations(base, cssOverrides, rect, role),
      parentSourceRef: parent,
      sourceRef,
      textRuns:
        text === undefined
          ? []
          : [{ end: text.length, sourceRef: `${sourceRef}:text`, start: 0, text }],
    };
  };
}

/*** Retains responsive observations, including a mobile layout shift, for every fixture node. */
function cardFixtureObservations(
  base: WebsiteObservedNode,
  overrides: Partial<WebsiteComputedCss>,
  rect: WebsiteNodeObservation['rect'],
  role: string | undefined,
): readonly WebsiteNodeObservation[] {
  const observation = base.observations[0]!;
  const css = observation.css!;
  return [
    {
      ...observation,
      css: { ...css, ...overrides },
      rect,
      semanticAttributes: role === undefined ? undefined : { role },
      viewportId: 'desktop',
    },
    {
      ...observation,
      css: { ...css, ...overrides },
      rect,
      semanticAttributes: role === undefined ? undefined : { role },
      viewportId: 'tablet',
    },
    {
      ...observation,
      css: { ...css, ...overrides, ...(overrides.display === 'grid' ? { display: 'flex' } : {}) },
      rect,
      semanticAttributes: role === undefined ? undefined : { role },
      viewportId: 'mobile',
    },
  ];
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
  return {
    ...observation('block'),
    css: {
      ...css,
      backgroundColor: 'rgb(250, 250, 250)',
      borderRadius: '12px',
      padding: edges('24px'),
    },
  };
}

/*** Creates colored but non-card evidence. */
function coloredObservation(): WebsiteNodeObservation {
  return { ...observation('block'), css: { ...css, backgroundColor: 'rgb(255, 0, 0)' } };
}

/*** Creates a boxless display-contents wrapper whose children retain their own rendered evidence. */
function contentsObservation(): WebsiteNodeObservation {
  return {
    ...observation('contents'),
    rect: { height: 0, width: 0, x: 0, y: 0 },
  };
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
