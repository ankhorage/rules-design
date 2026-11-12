import { createHash } from 'node:crypto';

import type { UiNode } from '@ankhorage/contracts';
import type { WebsiteObservationDocument } from '@ankhorage/contracts/website';
import { expect, test } from 'bun:test';

import expectedRecognition from '../../../test/fixtures/website-recognition-expected.v1.json' with { type: 'json' };
import observationDocument from '../../../test/fixtures/website-recognition-observation.v1.json' with { type: 'json' };
import { websiteObservationDocumentFixture } from '../../../test/fixtures/websiteObservationDocument';
import { recognizeWebsiteDocument } from './recognizeWebsiteDocument';

const expectedRecognitionSha256 =
  '644dc230930bf0b21b50b9a3c3e6b8e4529f92716a2e179cc65fcdf83aca0128';
const canonicalObservation = observationDocument as unknown as WebsiteObservationDocument;

test('matches the immutable canonical two-page website recognition JSON acceptance fixture', async () => {
  const recognition = recognizeWebsiteDocument(canonicalObservation);
  const serialized = JSON.stringify(recognition);
  const home = page(recognition, 'home');
  const about = page(recognition, 'about');
  const homeRichText = node(home, '["home","#richtext"]');

  expect(JSON.stringify(recognition)).toBe(JSON.stringify(expectedRecognition));
  expect(
    createHash('sha256')
      .update(
        await Bun.file(
          new URL('../../../test/fixtures/website-recognition-expected.v1.json', import.meta.url),
        ).text(),
      )
      .digest('hex'),
  ).toBe(expectedRecognitionSha256);
  expect(JSON.stringify(JSON.parse(serialized))).toBe(serialized);
  expect(recognition).toEqual(recognizeWebsiteDocument(canonicalObservation));
  expect(recognition.pages).toHaveLength(2);
  expect(recognition.navigation.map((item) => item.label)).toEqual(['About', 'Home']);
  expect(childrenOf(uiNode(home.root, '["home","#grid"]'), 'Card')).toHaveLength(3);
  expect(homeRichText.props.find((property) => property.name === 'color')?.value).toBe(
    'rgb(17, 17, 17)',
  );
  expect(
    recognition.pages
      .flatMap((recognizedPage) => recognizedPage.nodes)
      .every((recognizedNode) => recognizedNode.sourceRefs.every(isQualified)),
  ).toBe(true);
  expect(recognition.media.map((media) => media.id)).toEqual([
    'asset\u0000asset:about',
    'asset\u0000asset:css-logo',
    'asset\u0000asset:hero',
    'asset\u0000asset:source-only',
  ]);
  expectSourceOnlyMedia(recognition);
  expectTabletGrid(node(home, '["home","#page"]'));
  expect(
    node(home, '["home","#missing"]').props.some((property) =>
      property.name.startsWith('unresolved:default:desktop:'),
    ),
  ).toBe(true);
  expect(about.nodes.some((recognizedNode) => recognizedNode.id === '["about","#grid"]')).toBe(
    true,
  );
});

test('assembles deterministic page-qualified structural and factual recognition without dropping source evidence', () => {
  const document = websiteObservationDocumentFixture();
  const recognition = recognizeWebsiteDocument(document);
  const serialized = JSON.stringify(recognition);
  const home = recognition.pages.find((page) => page.id === 'home');
  const pricing = recognition.pages.find((page) => page.id === 'pricing');
  const layout = home?.nodes.find((node) => node.id === '["home","#layout"]');
  const detached = home?.nodes.find((node) => node.id === '["home","#detached"]');

  expect(recognition).toEqual(recognizeWebsiteDocument(document));
  expect(JSON.stringify(JSON.parse(serialized))).toBe(serialized);
  expect(home?.nodes.map((node) => node.id)).toContain('["home","#parent > span.inline-red"]');
  expect(pricing?.nodes.map((node) => node.id)).toContain('["pricing","#layout"]');
  expect(
    layout?.responsive.some(
      (variant) =>
        variant.viewportId === 'mobile' &&
        variant.props.some(
          (property) => property.name === 'gridTemplateColumns' && property.value === '1fr',
        ),
    ),
  ).toBe(true);
  expect(
    detached?.props.some(
      (property) =>
        property.name === 'unresolved:default:desktop:computed-css' &&
        JSON.stringify(property.value) ===
          JSON.stringify({ code: 'computed-style-unavailable', message: 'The node was detached.' }),
    ),
  ).toBe(true);
  expect(recognition.designTokens.every((token) => token.sourceRefs.every(isQualified))).toBe(true);
  expect(
    recognition.pages.flatMap((page) => page.nodes).every((node) => isQualified(node.id)),
  ).toBe(true);
});

test('rejects ambiguous page-local source identities instead of silently overwriting them', () => {
  const document = websiteObservationDocumentFixture();
  const page = first(document.pages);
  const duplicate = { ...first(page.nodes) };
  const invalid = { ...document, pages: [{ ...page, nodes: [...page.nodes, duplicate] }] };

  expect(() => recognizeWebsiteDocument(invalid)).toThrow('Duplicate source reference');
});

/*** Confirms that serialized source identities retain both page and source components. */
function isQualified(value: string): boolean {
  const parsed: unknown = JSON.parse(value);
  return (
    Array.isArray(parsed) && parsed.length === 2 && parsed.every((part) => typeof part === 'string')
  );
}

/*** Reads the fixture's required first element without an unsafe assertion. */
function first<T>(values: readonly T[]): T {
  const [value] = values;
  if (value === undefined) throw new TypeError('Expected fixture value.');
  return value;
}

/*** Reads a named recognized page from the canonical acceptance output. */
function page(
  document: ReturnType<typeof recognizeWebsiteDocument>,
  pageId: string,
): (typeof document.pages)[number] {
  const recognizedPage = document.pages.find((candidate) => candidate.id === pageId);
  if (recognizedPage === undefined) throw new Error(`Missing page ${pageId}.`);
  return recognizedPage;
}

/*** Reads one source-qualified node from a recognized page. */
function node(page: ReturnType<typeof recognizeWebsiteDocument>['pages'][number], id: string) {
  const recognizedNode = page.nodes.find((candidate) => candidate.id === id);
  if (recognizedNode === undefined) throw new Error(`Missing node ${id}.`);
  return recognizedNode;
}

/*** Selects direct child UI nodes of one semantic type without flattening hierarchy. */
function childrenOf(
  node: { readonly children?: readonly { readonly type: string }[] },
  type: string,
) {
  return (node.children ?? []).filter((child) => child.type === type);
}

/*** Verifies that an observed asset without an owning source stays visible in the public DTO. */
function expectSourceOnlyMedia(document: ReturnType<typeof recognizeWebsiteDocument>): void {
  expect(document.media.find((media) => media.id === 'asset\u0000asset:source-only')).toEqual({
    asset: { mediaId: 'asset:source-only' },
    id: 'asset\u0000asset:source-only',
    originalUrl: 'https://example.test/source-only.svg',
    sourceRefs: [],
  });
}

/*** Verifies the measured tablet grid evidence without inferring an authored breakpoint. */
function expectTabletGrid(recognizedNode: ReturnType<typeof node>): void {
  expect(
    recognizedNode.responsive
      .find((variant) => variant.viewportId === 'tablet')
      ?.props.some(
        (property) =>
          property.name === 'gridTemplateColumns' &&
          property.value === 'repeat(2, minmax(0px, 1fr))',
      ),
  ).toBe(true);
}

/*** Finds a source-qualified UI node without collapsing its observed hierarchy. */
function uiNode(node: UiNode, id: string): UiNode {
  if (node.id === id) return node;
  for (const child of node.children ?? []) {
    try {
      return uiNode(child, id);
    } catch {
      continue;
    }
  }
  throw new Error(`Missing UI node ${id}.`);
}
