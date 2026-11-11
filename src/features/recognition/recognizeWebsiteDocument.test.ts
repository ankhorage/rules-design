import { expect, test } from 'bun:test';

import { websiteObservationDocumentFixture } from '../../../test/fixtures/websiteObservationDocument';
import { recognizeWebsiteDocument } from './recognizeWebsiteDocument';

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
