import type {
  WebsiteComputedCss,
  WebsiteNodeObservation,
  WebsiteObservationDocument,
  WebsiteObservedNode,
} from '@ankhorage/contracts/website';

const provenance = {
  capturedAt: '2026-11-11T12:00:00.000Z',
  method: 'browser' as const,
  sourceUrl: 'https://example.test/',
};

/*** Creates a complete exact CSS sample, with fixture cases overriding only material values. */
function css(overrides: Partial<WebsiteComputedCss> = {}): WebsiteComputedCss {
  return {
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
    color: 'rgb(17, 17, 17)',
    display: 'block',
    flexBasis: 'auto',
    flexDirection: 'row',
    flexGrow: '0',
    flexShrink: '1',
    flexWrap: 'nowrap',
    fontFamily: 'Inter, sans-serif',
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
    letterSpacing: 'normal',
    lineHeight: 'normal',
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
    textDecoration: 'none solid rgb(17, 17, 17)',
    visibility: 'visible',
    ...overrides,
  };
}

/*** Creates each exact physical edge instead of reducing a CSS box to a shorthand. */
function edges(value: string) {
  return { bottom: value, left: value, right: value, top: value };
}

/*** Captures one available browser CSS sample for a named viewport and interaction state. */
function available(
  viewportId: string,
  style: WebsiteComputedCss,
  stateId = 'default',
): WebsiteNodeObservation {
  return {
    availability: { missing: null, status: 'available' },
    css: style,
    provenance,
    rect: { height: 40, width: 200, x: 0, y: 0 },
    stateId,
    viewportId,
  };
}

/*** Captures a producer-declared missing browser sample without manufacturing a replacement value. */
function missing(viewportId: string): WebsiteNodeObservation {
  return {
    availability: {
      missing: { code: 'computed-style-unavailable', message: 'The node was detached.' },
      status: 'missing',
    },
    css: null,
    provenance,
    rect: null,
    stateId: 'default',
    viewportId,
  };
}

/*** Creates a DOM observation with a stable source identity for recognition fixtures. */
function node(
  sourceRef: string,
  observations: readonly WebsiteNodeObservation[],
  overrides: Partial<WebsiteObservedNode> = {},
): WebsiteObservedNode {
  return {
    ancestorSourceRefs: [],
    dom: { attributes: {}, childIndex: 0, tagName: 'div' },
    links: [],
    media: [],
    observations,
    parentSourceRef: null,
    sourceRef,
    textRuns: [],
    ...overrides,
  };
}

/*** Provides exact CSS-class, inline-style, inherited, responsive, and unavailable evidence. */
export function websiteObservationDocumentFixture(): WebsiteObservationDocument {
  const desktopGrid = css({
    backgroundColor: 'rgb(250, 250, 250)',
    borderColor: 'rgb(229, 231, 235)',
    borderRadius: '12px',
    borderWidth: '1px',
    boxShadow: 'rgba(15, 23, 42, 0.12) 0px 8px 24px 0px',
    display: 'grid',
    gap: '24px',
    gridTemplateColumns: 'repeat(3, minmax(0px, 1fr))',
    margin: edges('16px'),
    padding: edges('24px'),
  });
  const mobileGrid = css({ ...desktopGrid, fontSize: '14px', gridTemplateColumns: '1fr' });
  const inlineRed = css({ color: 'rgb(255, 0, 0)', fontWeight: '700' });

  return {
    collectedAt: '2026-11-11T12:00:00.000Z',
    documentId: 'website:fixture',
    pages: [
      {
        assets: [],
        id: 'home',
        navigation: [],
        nodes: [
          node('#layout', [available('desktop', desktopGrid), available('mobile', mobileGrid)]),
          node('#parent', [available('desktop', css({ color: 'rgb(17, 17, 17)' }))]),
          node('#parent > span.inline-red', [available('desktop', inlineRed)], {
            ancestorSourceRefs: ['#parent'],
            dom: { attributes: { style: 'color: red' }, childIndex: 0, tagName: 'span' },
            parentSourceRef: '#parent',
            textRuns: [
              { end: 3, sourceRef: '#parent > span.inline-red:text', start: 0, text: 'red' },
            ],
          }),
          node('#inherited', [available('desktop', css({ color: 'rgb(17, 17, 17)' }))], {
            ancestorSourceRefs: ['#parent'],
            parentSourceRef: '#parent',
          }),
          node('#conflicting-declarations', [available('desktop', inlineRed)], {
            dom: {
              attributes: { class: 'blue-text', style: 'color: rgb(255, 0, 0)' },
              childIndex: 1,
              tagName: 'span',
            },
          }),
          node('#flex', [
            available(
              'desktop',
              css({ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: '12px' }),
            ),
          ]),
          node('#hero-image', [available('desktop', css())], {
            media: [
              {
                alt: 'Example hero',
                assetId: 'asset:hero',
                kind: 'image',
                sourceRef: '#hero-image',
                url: 'https://example.test/hero.webp',
              },
            ],
          }),
          node('#detached', [missing('desktop')]),
        ],
        path: '/',
        states: [{ id: 'default', name: 'Default' }],
        url: 'https://example.test/',
        viewports: [
          { devicePixelRatio: 1, height: 900, id: 'desktop', width: 1440 },
          { devicePixelRatio: 3, height: 844, id: 'mobile', width: 390 },
        ],
      },
    ],
    schemaVersion: 1,
    site: { id: 'example', url: 'https://example.test/' },
    source: {
      crawlerId: 'fixture',
      crawlerVersion: '1.0.0',
      crawlId: 'crawl:fixture',
      revision: null,
    },
  };
}
