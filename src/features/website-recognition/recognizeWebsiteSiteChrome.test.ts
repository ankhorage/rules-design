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
  const localHeader = candidate(candidates, 'header', 'home', '#flex');
  const siteFooter = candidate(candidates, 'footer', 'pricing', '#layout');
  const headerMembership = membership(siteHeader);
  const footerMembership = membership(siteFooter);

  expect(siteHeader.classification).toBe('site-candidate');
  expect(headerMembership.state).toBe('variant');
  expect(headerMembership.source.semantics).toEqual({ ariaLabel: null, role: null });
  expect(headerMembership.subtree.root.children?.map((child) => child.id)).toEqual([
    '["home","#detached"]',
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

/*** Creates HTML, ARIA, local-content, responsive, and unresolved-child source evidence. */
function siteChromeDocument(): WebsiteObservationDocument {
  const document = websiteObservationDocumentFixture();
  return {
    ...document,
    pages: document.pages.map((page) => ({
      ...page,
      nodes: page.nodes.map((node) => changedNode(page.id, node)),
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
