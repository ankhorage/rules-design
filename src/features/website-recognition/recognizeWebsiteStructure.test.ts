import type { UiNode } from '@ankhorage/contracts';
import type { WebsitePageRecognition } from '@ankhorage/contracts/website';
import { expect, test } from 'bun:test';

import {
  createColoredColumnsDocument,
  createComplexLayoutDocument,
  createDocument,
  createIncompleteWrapperEvidenceDocument,
  createMalformedDocument,
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

  expect(recognizedNode(page, 'complex:nav').componentType).toBe('Container');
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
      type: 'Container',
    },
  ],
  type: 'Container',
};
