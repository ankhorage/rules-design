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
  animationEvidence?: WebsiteNodeObservation['animationEvidence'],
): WebsiteNodeObservation {
  return {
    availability: { missing: null, status: 'available' },
    ...(animationEvidence === undefined ? {} : { animationEvidence }),
    css: style,
    provenance,
    rect: { height: 40, width: 200, x: 0, y: 0 },
    stateId,
    viewportId,
  };
}

/*** Captures one available CSS animation property without changing its browser literal. */
function animationProperty(value: string) {
  return { availability: { missing: null, status: 'available' as const }, value };
}

/*** Captures a producer-declared unavailable animation property without a substitute value. */
function missingAnimationProperty(code: string, message: string) {
  return {
    availability: { missing: { code, message }, status: 'missing' as const },
    value: null,
  };
}

/*** Creates factual animation evidence for one observed state without estimating an endpoint. */
function animationEvidence(
  transform: string,
  pseudoElements: WebsiteNodeObservation['animationEvidence'] extends infer Evidence
    ? Evidence extends { readonly pseudoElements: infer PseudoElements }
      ? PseudoElements
      : never
    : never,
  animation = 'none',
) {
  return {
    pseudoElements,
    target: {
      animation: animationProperty(animation),
      transform: animationProperty(transform),
      transition: animationProperty('transform 200ms ease'),
    },
    trigger: 'scroll-into-view' as const,
    uncertainty: [],
  };
}

/*** Creates observed pseudo-element evidence without turning generated CSS into a DOM child. */
function pseudoElement(pseudo: '::after' | '::before', width: string, height: string) {
  return {
    availability: { missing: null, status: 'available' as const },
    boxSize: { height: animationProperty(height), width: animationProperty(width) },
    content: animationProperty('""'),
    css: css(),
    pseudo,
  };
}

/*** Retains a missing generated pseudo-element as explicit animation evidence. */
function missingPseudoElement() {
  const unavailable = () =>
    missingAnimationProperty('pseudo-element-unavailable', 'The generated element was absent.');
  return {
    availability: {
      missing: { code: 'pseudo-element-unavailable', message: 'The generated element was absent.' },
      status: 'missing' as const,
    },
    boxSize: { height: unavailable(), width: unavailable() },
    content: unavailable(),
    css: null,
    pseudo: '::after' as const,
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
      {
        assets: [],
        id: 'pricing',
        navigation: [],
        nodes: [node('#layout', [available('desktop', css({ padding: edges('24px') }))])],
        path: '/pricing',
        states: [{ id: 'default', name: 'Default' }],
        url: 'https://example.test/pricing',
        viewports: [{ devicePixelRatio: 1, height: 900, id: 'desktop', width: 1440 }],
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

/*** Provides isolated animation evidence while preserving the normal recognition fixture unchanged. */
export function websiteAnimationObservationDocumentFixture(): WebsiteObservationDocument {
  const document = websiteObservationDocumentFixture();
  const [home, ...otherPages] = document.pages;
  if (home === undefined) throw new Error('Expected the home page fixture.');
  return {
    ...document,
    documentId: 'website:animation-fixture',
    pages: [
      {
        ...home,
        nodes: [...home.nodes, ...animationNodes()],
        states: [
          { id: 'default', name: 'Initial' },
          { id: 'triggered', name: 'Triggered' },
          { id: 'settled', name: 'Settled' },
        ],
      },
      ...otherPages,
    ],
  };
}

/*** Creates source nodes for paired, static, and unresolved portable animation evidence. */
function animationNodes(): readonly WebsiteObservedNode[] {
  return [
    node('#animated', [
      available(
        'desktop',
        css(),
        'default',
        animationEvidence('translateY(20px)', [pseudoElement('::before', '0px', '2px')]),
      ),
      available(
        'desktop',
        css(),
        'triggered',
        animationEvidence('translateY(10px)', [pseudoElement('::before', '32px', '2px')]),
      ),
      available(
        'desktop',
        css(),
        'settled',
        animationEvidence('none', [pseudoElement('::before', '75px', '2px')]),
      ),
    ]),
    node('#declared-animation', [
      available(
        'desktop',
        css(),
        'default',
        animationEvidence('none', [], 'pulse 1s linear infinite'),
      ),
    ]),
    node('#animated-parent', [
      available(
        'desktop',
        css(),
        'default',
        animationEvidence('translateY(48px)', [pseudoElement('::before', '10px', '2px')]),
      ),
    ]),
    node(
      '#animated-parent > #animated-child',
      [
        available(
          'desktop',
          css(),
          'default',
          animationEvidence('scale(0.9)', [pseudoElement('::after', '20px', '3px')]),
        ),
      ],
      {
        ancestorSourceRefs: ['#animated-parent'],
        dom: { attributes: {}, childIndex: 0, tagName: 'span' },
        parentSourceRef: '#animated-parent',
        textRuns: [
          {
            end: 13,
            sourceRef: '#animated-parent > #animated-child:text',
            start: 0,
            text: 'Animated child',
          },
        ],
      },
    ),
    node('#missing-pseudo', [
      available('desktop', css(), 'default', {
        pseudoElements: [missingPseudoElement()],
        target: {
          animation: animationProperty('none'),
          transform: animationProperty('none'),
          transition: animationProperty('none'),
        },
        trigger: 'unknown',
        uncertainty: [
          {
            code: 'animation-timing-unavailable',
            message: 'No timeline progress sample was available.',
          },
        ],
      }),
    ]),
  ];
}
