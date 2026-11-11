import { expect, test } from 'bun:test';

import { websiteObservationDocumentFixture } from '../../../test/fixtures/websiteObservationDocument';
import { recognizeWebsiteDesignProperties } from './recognizeWebsiteDesignProperties';

const recognition = recognizeWebsiteDesignProperties(websiteObservationDocumentFixture());

test('retains computed inline and inherited colors without interpreting declarations', () => {
  const inlineRed = node('#parent > span.inline-red');
  const inherited = node('#inherited');
  const conflicting = node('#conflicting-declarations');

  expect(value(inlineRed.colors, 'color', 'desktop')).toBe('rgb(255, 0, 0)');
  expect(value(inherited.colors, 'color', 'desktop')).toBe('rgb(17, 17, 17)');
  expect(value(conflicting.colors, 'color', 'desktop')).toBe('rgb(255, 0, 0)');
  expect(inlineRed.colors.find((observation) => observation.name === 'color')).toMatchObject({
    pageId: 'home',
    provenance: { method: 'browser', sourceUrl: 'https://example.test/' },
    sourceRef: '#parent > span.inline-red',
  });
});

test('retains exact Grid, Flex, spacing, border, shadow, typography, responsive, and media evidence', () => {
  const layout = node('#layout');
  const flex = node('#flex');

  expect(value(layout.layout, 'gridTemplateColumns', 'desktop')).toBe(
    'repeat(3, minmax(0px, 1fr))',
  );
  expect(value(layout.layout, 'gridTemplateColumns', 'mobile')).toBe('1fr');
  expect(value(layout.layout, 'padding', 'desktop')).toEqual({
    bottom: '24px',
    left: '24px',
    right: '24px',
    top: '24px',
  });
  expect(value(layout.layout, 'borderWidth', 'desktop')).toBe('1px');
  expect(value(layout.layout, 'boxShadow', 'desktop')).toBe(
    'rgba(15, 23, 42, 0.12) 0px 8px 24px 0px',
  );
  expect(value(layout.typography, 'fontSize', 'mobile')).toBe('14px');
  expect(value(flex.layout, 'display', 'desktop')).toBe('flex');
  expect(value(flex.layout, 'alignItems', 'desktop')).toBe('center');
  expect(layout.responsive.map((observation) => observation.viewportId)).toEqual([
    'desktop',
    'mobile',
  ]);
  expect(node('#hero-image').media).toEqual([
    expect.objectContaining({
      assetId: 'asset:hero',
      kind: 'image',
      url: 'https://example.test/hero.webp',
    }),
  ]);
});

test('creates role-free candidates only when values repeat across distinct source nodes', () => {
  const red = recognition.tokenCandidates.find(
    (candidate) => candidate.kind === 'color' && candidate.value === 'rgb(255, 0, 0)',
  );
  const mobileOnlyGrid = recognition.tokenCandidates.find((candidate) => candidate.value === '1fr');

  expect(red).toEqual({
    confidence: 2 / 8,
    inferredRole: null,
    kind: 'color',
    property: 'color',
    originalValues: ['rgb(255, 0, 0)'],
    sourceRefs: [
      { pageId: 'home', sourceRef: '#conflicting-declarations' },
      { pageId: 'home', sourceRef: '#parent > span.inline-red' },
    ],
    value: 'rgb(255, 0, 0)',
  });
  expect(mobileOnlyGrid).toBeUndefined();
});

test('qualifies duplicated DOM paths by page and derives referenced spacing edges without mutation', () => {
  const homeLayout = node('#layout', 'home');
  const pricingLayout = node('#layout', 'pricing');
  const padding = recognition.tokenCandidates.find(
    (candidate) =>
      candidate.kind === 'spacing' &&
      candidate.property === 'padding.top' &&
      candidate.value === '24px',
  );

  expect(homeLayout).toMatchObject({ pageId: 'home', sourceRef: '#layout' });
  expect(pricingLayout).toMatchObject({ pageId: 'pricing', sourceRef: '#layout' });
  expect(value(homeLayout.layout, 'padding', 'desktop')).toEqual({
    bottom: '24px',
    left: '24px',
    right: '24px',
    top: '24px',
  });
  expect(padding).toMatchObject({
    sourceRefs: [
      { pageId: 'home', sourceRef: '#layout' },
      { pageId: 'pricing', sourceRef: '#layout' },
    ],
  });
});

test('keeps equal CSS literals from distinct properties as distinct token candidates', () => {
  const fontStyle = recognition.tokenCandidates.find(
    (candidate) =>
      candidate.kind === 'typography' &&
      candidate.property === 'fontStyle' &&
      candidate.value === 'normal',
  );
  const lineHeight = recognition.tokenCandidates.find(
    (candidate) =>
      candidate.kind === 'typography' &&
      candidate.property === 'lineHeight' &&
      candidate.value === 'normal',
  );

  expect(fontStyle).toBeDefined();
  expect(lineHeight).toBeDefined();
  expect(fontStyle).not.toEqual(lineHeight);
});

test('retains explicit missing evidence as unresolved and survives JSON roundtrip', () => {
  const detached = node('#detached');
  const roundTripped: unknown = JSON.parse(JSON.stringify(recognition));

  expect(detached.unresolved).toEqual([
    expect.objectContaining({
      kind: 'computed-css',
      missing: { code: 'computed-style-unavailable', message: 'The node was detached.' },
    }),
    expect.objectContaining({ kind: 'geometry' }),
  ]);
  expect(roundTripped).toEqual(recognition);
});

/*** Finds one source node in the recognition fixture. */
function node(sourceRef: string, pageId = 'home') {
  const result = recognition.nodes.find(
    (candidate) => candidate.pageId === pageId && candidate.sourceRef === sourceRef,
  );
  if (result === undefined) throw new Error(`Missing fixture node: ${sourceRef}`);
  return result;
}

/*** Reads an exact property sample by property and observed viewport. */
function value(
  observations: readonly {
    readonly name: string;
    readonly value: unknown;
    readonly viewportId: string;
  }[],
  name: string,
  viewportId: string,
) {
  const observation = observations.find(
    (candidate) => candidate.name === name && candidate.viewportId === viewportId,
  );
  if (observation === undefined) throw new Error(`Missing ${name} at ${viewportId}.`);
  return observation.value;
}
