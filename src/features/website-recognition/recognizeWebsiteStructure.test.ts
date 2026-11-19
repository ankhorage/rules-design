import type { UiNode } from '@ankhorage/contracts';
import type { WebsitePageRecognition } from '@ankhorage/contracts/website';
import { expect, test } from 'bun:test';

import {
  createCardAndDividerEvidenceDocument,
  createColoredColumnsDocument,
  createComplexLayoutDocument,
  createDocument,
  createIncompleteWrapperEvidenceDocument,
  createMalformedDocument,
  createVisibleCardAndDividerDocument,
  createWebsiteRegionDocument,
  createWebsiteRegionFallbackDocument,
  sourceRefsFor,
} from '../../../test/fixtures/websiteRecognition';
import { recognizeWebsiteStructure } from './recognizeWebsiteStructure.ts';

test('recognizes equivalent static, React-like, and Elementor-like DOM hierarchies', () => {
  const pages = variants.map((variant) => recognizedPage(createDocument(variant)));
  const semanticTrees = pages.map((page) => normalizeTree(page.root));

  expect(semanticTrees).toEqual([expectedSemanticTree, expectedSemanticTree, expectedSemanticTree]);
  expect(sourceRefsFor(createDocument('static'))).not.toEqual(
    sourceRefsFor(createDocument('react')),
  );
  expect(sourceRefsFor(createDocument('react'))).not.toEqual(
    sourceRefsFor(createDocument('elementor')),
  );
});

test('retains deterministic unique source mappings and serializable provenance', () => {
  const document = createDocument('elementor');
  const page = recognizedPage(document);
  const sourceRefs = sourceRefsFor(document);
  const firstCard = recognizedNode(page, 'elementor:card:one');

  expect(recognizeWebsiteStructure(document)).toEqual(recognizeWebsiteStructure(document));
  expect(new Set(page.nodes.map((node) => node.id)).size).toBe(page.nodes.length);
  expect(page.nodes.every((node) => sourceRefs.includes(node.id))).toBe(true);
  expect(sourceRefs.every((sourceRef) => recognizedSourceRefs(page).has(sourceRef))).toBe(true);
  expect(firstCard.sourceRefs).toEqual([
    'elementor:column:one',
    'elementor:card:one:inner',
    'elementor:card:one',
  ]);
  expect(JSON.parse(JSON.stringify(page.root))).toEqual(page.root);
  expect(JSON.parse(JSON.stringify(page.nodes))).toEqual(page.nodes);
});

test('does not invent cards and preserves malformed source evidence', () => {
  const coloredPage = recognizedPage(createColoredColumnsDocument());
  const malformedDocument = createMalformedDocument();
  const malformedPage = recognizedPage(malformedDocument);

  expect(coloredPage.nodes.some((node) => node.componentType === 'Card')).toBe(false);
  expect(
    sourceRefsFor(malformedDocument).every((sourceRef) =>
      malformedPage.nodes.some((node) => node.id === sourceRef),
    ),
  ).toBe(true);
  expect(recognizedNode(malformedPage, 'malformed:invalid-parent').status).toBe('unresolved');
  expect(recognizedNode(malformedPage, 'malformed:cycle:a').unresolved?.reason).toBe(
    'Source hierarchy contains a cycle.',
  );
  expect(recognizedNode(malformedPage, 'malformed:cycle:b').unresolved?.reason).toBe(
    'Source hierarchy contains a cycle.',
  );
  expect(recognizedNode(malformedPage, 'malformed:missing').unresolved?.reason).toBe(
    'No available rendered observation exists for this source node.',
  );
});

test('prioritizes measured layout, cards, and HTML semantics while folding boxless wrappers', () => {
  const page = recognizedPage(createComplexLayoutDocument());
  const grid = recognizedNode(page, 'complex:grid');
  const firstCard = recognizedNode(page, 'complex:card:one');
  const secondCard = recognizedNode(page, 'complex:card:two');
  const heading = recognizedNode(page, 'complex:heading');
  const unknown = recognizedNode(page, 'complex:unknown');

  expect(recognizedNode(page, 'complex:main').componentType).toBe('Main');
  expect(recognizedNode(page, 'complex:nav').componentType).toBe('Nav');
  expect(recognizedNode(page, 'complex:nav-list').componentType).toBe('List');
  expect(recognizedNode(page, 'complex:nav-link').componentType).toBe('Link');
  expect(grid.componentType).toBe('Grid');
  expect(firstCard.componentType).toBe('Card');
  expect(secondCard.componentType).toBe('Card');
  expect(heading.sourceRefs).toEqual(['complex:contents', 'complex:heading']);
  expect(page.nodes.some((node) => node.id === 'complex:contents')).toBe(false);
  expect(unknown.status).toBe('unresolved');
  expect(recognizedNode(page, 'complex:unknown-child').componentType).toBe('Heading');
  expect(
    page.root.children?.some((node) => containsUiNode(node, 'complex:unknown-child', 'Heading')),
  ).toBe(true);
});

test('retains wrappers and recognized children when CSS or layout evidence is unknown', () => {
  const page = recognizedPage(createIncompleteWrapperEvidenceDocument());
  const wrapper = recognizedNode(page, 'incomplete-wrapper:wrapper');

  expect(wrapper.status).toBe('unresolved');
  expect(wrapper.sourceRefs).toEqual(['incomplete-wrapper:wrapper']);
  expect(recognizedNode(page, 'incomplete-wrapper:heading').componentType).toBe('Heading');
  expect(
    containsUiNode(page.root, 'incomplete-wrapper:wrapper', 'Unknown') &&
      containsUiNode(page.root, 'incomplete-wrapper:heading', 'Heading'),
  ).toBe(true);
});

test('recognizes four independently bounded responsive cards and a provider-neutral CSS divider', () => {
  const document = createVisibleCardAndDividerDocument();
  const page = recognizedPage(document);
  const cards = page.nodes.filter((node) => node.componentType === 'Card');

  expect(cards.map((node) => node.id)).toEqual([
    'surface:marketing',
    'surface:design',
    'surface:realization',
    'surface:websites',
  ]);
  expect(recognizedNode(page, 'surface:divider').componentType).toBe('Divider');
  expect(recognizedNode(page, 'surface:realization').sourceRefs).toEqual([
    'surface:wrapper',
    'surface:realization',
  ]);
  expect(recognizedNode(page, 'surface:websites').componentType).toBe('Card');
  expect(page.nodes.some((node) => node.id === 'surface:wrapper')).toBe(false);
  expect(
    page.nodes.filter((node) => node.componentType === 'Heading').map((node) => node.id),
  ).toEqual([
    'surface:marketing-heading',
    'surface:design-heading',
    'surface:realization-heading',
    'surface:websites-heading',
  ]);
  expect(document.pages[0]?.viewports.map((viewport) => viewport.width)).toEqual([1440, 768, 390]);
});

test('recognizes empty and image surfaces but excludes radius, equal backgrounds, invisible borders, and non-line borders', () => {
  const page = recognizedPage(createCardAndDividerEvidenceDocument());

  expect(recognizedNode(page, 'surface:empty').componentType).toBe('Card');
  expect(recognizedNode(page, 'surface:image').componentType).toBe('Card');
  expect(recognizedNode(page, 'surface:radius-only').componentType).not.toBe('Card');
  expect(recognizedNode(page, 'surface:same-background').componentType).not.toBe('Card');
  expect(recognizedNode(page, 'surface:invisible-border').componentType).not.toBe('Card');
  expect(
    ['surface:hr', 'surface:aria', 'surface:css-line'].map(
      (sourceRef) => recognizedNode(page, sourceRef).componentType,
    ),
  ).toEqual(['Divider', 'Divider', 'Divider']);
  expect(recognizedNode(page, 'surface:section-border').componentType).not.toBe('Divider');
  expect(recognizedNode(page, 'surface:hidden-line').componentType).not.toBe('Divider');
});

test('recognizes ordered website regions and keeps four product cards inside Main', () => {
  const page = recognizedPage(createWebsiteRegionDocument());
  const main = recognizedNode(page, 'surface:main');
  const nav = recognizedNode(page, 'surface:primary-nav');

  expect(
    ['surface:header', 'surface:main', 'surface:footer'].map(
      (sourceRef) => recognizedNode(page, sourceRef).componentType,
    ),
  ).toEqual(['Header', 'Main', 'Footer']);
  expect(nav.componentType).toBe('Nav');
  expect(recognizedNode(page, 'surface:mobile-nav').componentType).toBe('Nav');
  expect(main.sourceRefs).toEqual(['surface:main']);
  expect(cardsInUiNode(uiNode(page.root, 'surface:main'))).toEqual([
    'surface:marketing',
    'surface:design',
    'surface:realization',
    'surface:websites',
  ]);
  expect(recognizedNode(page, 'surface:footer-cta').componentType).toBe('Card');
  expect(recognizedNode(page, 'surface:divider').componentType).toBe('Divider');
});

test('groups pages without main as analysis-only Main while retaining local article landmarks', () => {
  const page = recognizedPage(createWebsiteRegionFallbackDocument());
  const fallbackMain = uiNode(page.root, 'page:main');

  expect(page.nodes.some((node) => node.componentType === 'Main')).toBe(false);
  expect(fallbackMain.type).toBe('Main');
  expect(fallbackMain.children?.map((node) => node.id)).toContain('surface:main');
  expect(recognizedNode(page, 'surface:primary-nav').componentType).toBe('Nav');
  expect(recognizedNode(page, 'surface:article-header').componentType).toBe('Header');
  expect(recognizedNode(page, 'surface:article-footer').componentType).toBe('Footer');
});

/*** Returns the single recognition page produced by a complete fixture document. */
function recognizedPage(
  document: Parameters<typeof recognizeWebsiteStructure>[0],
): WebsitePageRecognition {
  return recognizeWebsiteStructure(document)[0];
}

/*** Gets a source-derived recognition node or fails with its missing source identity. */
function recognizedNode(page: WebsitePageRecognition, sourceRef: string) {
  const node = page.nodes.find((candidate) => candidate.id === sourceRef);
  if (node === undefined) throw new Error(`Missing recognition for ${sourceRef}.`);
  return node;
}

/*** Collects every source reference retained by recognized nodes. */
function recognizedSourceRefs(page: WebsitePageRecognition): ReadonlySet<string> {
  return new Set(page.nodes.flatMap((node) => node.sourceRefs));
}

/*** Removes source-only identity while retaining full semantic tree structure and props. */
function normalizeTree(node: UiNode): unknown {
  return JSON.parse(JSON.stringify(node, removeSourceIdentity));
}

/*** Finds a source-derived UI node without dropping descendants of an unresolved parent. */
function containsUiNode(node: UiNode, id: string, type: string): boolean {
  return (
    (node.id === id && node.type === type) ||
    (node.children ?? []).some((child) => containsUiNode(child, id, type))
  );
}

/*** Finds a preserved source node in the canonical UI tree. */
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

/*** Collects Cards from one Main subtree without counting independent footer surfaces. */
function cardsInUiNode(node: UiNode): readonly string[] {
  return [
    ...(node.type === 'Card' ? [node.id] : []),
    ...(node.children ?? []).flatMap(cardsInUiNode),
  ];
}

/*** Removes source-derived node and property references from semantic comparisons. */
function removeSourceIdentity(key: string, value: unknown): unknown {
  return key === 'id' || key === 'sourceRef' ? undefined : value;
}

const variants = ['static', 'react', 'elementor'] as const;
const expectedSemanticTree = {
  children: [
    {
      children: [
        {
          children: [
            {
              children: [
                {
                  props: { level: 2, textRuns: [{ end: 7, start: 0, text: 'Welcome' }] },
                  type: 'Heading',
                },
                {
                  children: [
                    {
                      props: { textRuns: [{ end: 15, start: 0, text: 'red styled text' }] },
                      type: 'RichText',
                    },
                  ],
                  props: { textRuns: [{ end: 4, start: 0, text: 'Our ' }] },
                  type: 'RichText',
                },
              ],
              type: 'Card',
            },
            {
              children: [
                {
                  props: {
                    media: [
                      {
                        alt: 'A team at work',
                        assetId: 'asset:team',
                        kind: 'image',
                        url: 'https://example.test/team.jpg',
                      },
                    ],
                  },
                  type: 'Image',
                },
              ],
              type: 'Card',
            },
            {
              children: [
                {
                  children: [
                    {
                      props: {
                        links: [{ label: 'Contact us', url: 'https://example.test/contact' }],
                        textRuns: [{ end: 10, start: 0, text: 'Contact us' }],
                      },
                      type: 'Link',
                    },
                  ],
                  type: 'Form',
                },
              ],
              type: 'Card',
            },
          ],
          type: 'Grid',
        },
        { type: 'Unknown' },
        { type: 'Unknown' },
      ],
      type: 'Main',
    },
  ],
  type: 'Container',
};
