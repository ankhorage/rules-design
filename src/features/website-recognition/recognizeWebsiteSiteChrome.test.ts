import type {
  WebsiteObservationDocument,
  WebsiteObservedNode,
  WebsiteSiteChromeCandidate,
} from '@ankhorage/contracts/website';
import { expect, test } from 'bun:test';

import { websiteObservationDocumentFixture } from '../../../test/fixtures/websiteObservationDocument';
import { recognizeWebsiteDocument } from '../recognition/recognizeWebsiteDocument';

test('keeps site-chrome evidence page-grounded while retaining complete recursive candidate trees', () => {
  const recognition = recognizeWebsiteDocument(siteChromeDocument());
  const candidates = recognition.siteChrome?.candidates ?? [];
  const siteHeader = candidate(candidates, 'header', 'home', '#layout');
  const localHeader = candidate(candidates, 'header', 'home', '#article-header');
  const siteFooter = candidate(candidates, 'footer', 'pricing', '#layout');
  const headerMembership = membership(siteHeader);
  const footerMembership = membership(siteFooter);

  expect(siteHeader.classification).toBe('site-candidate');
  expect(headerMembership.state).toBe('variant');
  expect(headerMembership.source.semantics).toEqual({ ariaLabel: null, role: null });
  expect(headerMembership.subtree.root.children?.map((child) => child.id)).toEqual([
    '["home","#detached"]',
    '["home","#nested-banner"]',
    '["home","#parent"]',
  ]);
  expect(headerMembership.subtree.nodes.map((node) => node.id)).toContain('["home","#detached"]');
  expect(
    headerMembership.subtree.nodes.find((node) => node.id === '["home","#layout"]')?.responsive,
  ).not.toEqual([]);
  expect(localHeader.classification).toBe('page-local');
  expect(siteFooter.classification).toBe('site-candidate');
  expect(footerMembership.source.semantics).toEqual({
    ariaLabel: 'Site information',
    role: 'contentinfo',
  });
  expect(candidates.every((candidate) => candidate.memberships.length === 1)).toBe(true);
});

test('uses one owning landmark per role while respecting role overrides and local content', () => {
  const candidates = recognizeWebsiteDocument(siteChromeDocument()).siteChrome?.candidates ?? [];

  expect(candidate(candidates, 'header', 'home', '#layout').classification).toBe('site-candidate');
  expect(candidate(candidates, 'footer', 'pricing', '#layout').classification).toBe(
    'site-candidate',
  );
  expect(candidates.map((item) => item.id)).not.toContain(
    JSON.stringify(['header', 'home', '#nested-banner']),
  );
  expect(candidates.map((item) => item.id)).not.toContain(
    JSON.stringify(['footer', 'pricing', '#nested-footer']),
  );
  expect(candidates.map((item) => item.id)).not.toContain(
    JSON.stringify(['header', 'home', '#navigation']),
  );
  expect(candidates.map((item) => item.id)).not.toContain(
    JSON.stringify(['footer', 'pricing', '#presentation']),
  );
  expect(candidate(candidates, 'header', 'home', '#article-header').classification).toBe(
    'page-local',
  );
  expect(candidate(candidates, 'header', 'home', '#card-header').classification).toBe('page-local');
});

test('retains page-scoped uncertainty for missing and alternative chrome variants', () => {
  const document = siteChromeDocument();
  const onePage = { ...document, pages: document.pages.filter((page) => page.id === 'home') };
  const candidates = recognizeWebsiteDocument(onePage).siteChrome?.candidates ?? [];
  const sectionBanner = candidate(candidates, 'header', 'home', '#section-banner');

  expect(candidates.filter((item) => item.role === 'footer')).toEqual([]);
  expect(sectionBanner.classification).toBe('site-candidate');
  expect(sectionBanner.memberships).toHaveLength(1);
  expect(sectionBanner.memberships[0]?.pageId).toBe('home');
});

/*** Creates HTML, ARIA, local-content, responsive, and unresolved-child source evidence. */
function siteChromeDocument(): WebsiteObservationDocument {
  const document = websiteObservationDocumentFixture();
  return {
    ...document,
    pages: document.pages.map((page) => ({
      ...page,
      nodes: [
        ...page.nodes.map((node) => changedNode(page.id, node)),
        ...addedNodes(page.id, page.nodes),
      ],
    })),
  };
}

/*** Alters only the fixture nodes needed to exercise source-grounded chrome classification. */
function changedNode(pageId: string, node: WebsiteObservedNode): WebsiteObservedNode {
  if (pageId === 'home' && node.sourceRef === '#layout')
    return {
      ...node,
      dom: { ...node.dom, tagName: 'header' },
      observations: node.observations.map((observation) =>
        observation.viewportId === 'mobile' && observation.css !== null
          ? { ...observation, css: { ...observation.css, display: 'none' } }
          : observation,
      ),
    };
  if (pageId === 'home' && node.sourceRef === '#parent')
    return { ...node, dom: { ...node.dom, tagName: 'article' }, parentSourceRef: '#layout' };
  if (pageId === 'home' && node.sourceRef === '#flex')
    return { ...node, dom: { ...node.dom, tagName: 'header' }, parentSourceRef: '#parent' };
  if (pageId === 'home' && node.sourceRef === '#detached')
    return { ...node, parentSourceRef: '#layout' };
  if (pageId === 'pricing' && node.sourceRef === '#layout')
    return {
      ...node,
      dom: { ...node.dom, tagName: 'div' },
      observations: node.observations.map((observation) => ({
        ...observation,
        semanticAttributes: { 'aria-label': 'Site information', role: 'contentinfo' },
      })),
    };
  return node;
}

/*** Adds observed nesting, override, wrapper, and card cases without weakening the canonical fixture. */
function addedNodes(
  pageId: string,
  nodes: readonly WebsiteObservedNode[],
): readonly WebsiteObservedNode[] {
  const layout = observedNode(nodes, '#layout');
  if (pageId === 'home')
    return [
      withNode(layout, '#nested-banner', '#layout', 'div', { role: 'banner' }),
      withNode(layout, '#navigation', null, 'header', { role: 'navigation' }),
      withNode(layout, '#section-layout', null, 'section'),
      withNode(layout, '#section-banner', '#section-layout', 'div', { role: 'banner' }),
      withNode(layout, '#article', null, 'article'),
      withNode(layout, '#article-header', '#article', 'header'),
      withNode(layout, '#cards', null, 'div', {}, gridCss),
      withNode(layout, '#card-one', '#cards', 'div', {}, cardCss),
      withNode(layout, '#card-two', '#cards', 'div', {}, cardCss),
      withNode(layout, '#card-header', '#card-one', 'header'),
    ];
  return [
    withNode(layout, '#nested-footer', '#layout', 'div', { role: 'contentinfo' }),
    withNode(layout, '#presentation', null, 'footer', { role: 'presentation' }),
  ];
}

/*** Finds a fixture node whose complete observation shape is reused for focused mutations. */
function observedNode(
  nodes: readonly WebsiteObservedNode[],
  sourceRef: string,
): WebsiteObservedNode {
  const found = nodes.find((node) => node.sourceRef === sourceRef);
  if (found === undefined) throw new Error(`Missing observed node ${sourceRef}.`);
  return found;
}

const cardCss = {
  borderRadius: '12px',
  borderWidth: '1px',
  padding: { bottom: '24px', left: '24px', right: '24px', top: '24px' },
};

const gridCss = { display: 'grid' };

/*** Derives one valid fixture node while changing only ownership-relevant DOM or surface evidence. */
function withNode(
  source: WebsiteObservedNode,
  sourceRef: string,
  parentSourceRef: string | null,
  tagName: string,
  attributes: Record<string, string> = {},
  css: Partial<NonNullable<WebsiteObservedNode['observations'][number]['css']>> = {},
): WebsiteObservedNode {
  return {
    ...source,
    dom: { attributes, childIndex: 0, tagName },
    observations: source.observations.map((observation) =>
      observation.css === null
        ? observation
        : { ...observation, css: { ...observation.css, ...css } },
    ),
    parentSourceRef,
    sourceRef,
  };
}

/*** Finds one page-specific candidate by its source identity. */
function candidate(
  candidates: readonly WebsiteSiteChromeCandidate[],
  role: 'footer' | 'header',
  pageId: string,
  sourceRef: string,
) {
  const found = candidates.find(
    (candidate) => candidate.id === JSON.stringify([role, pageId, sourceRef]),
  );
  if (found === undefined) throw new Error(`Missing ${role} candidate ${sourceRef}.`);
  return found;
}

/*** Reads the complete emitted membership rather than weakening the contract's nullable boundary. */
function membership(candidate: WebsiteSiteChromeCandidate) {
  const [membership] = candidate.memberships;
  if (membership.source === null || membership.subtree === null)
    throw new Error('Expected complete source and subtree evidence.');
  return { ...membership, source: membership.source, subtree: membership.subtree };
}
