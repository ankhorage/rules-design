import type { WebsiteObservedNode } from '@ankhorage/contracts/website';

/*** Maps explicit HTML and observed ARIA semantics without relying on framework selectors. */
export function recognizeWebsiteStructureSemanticComponentType(
  node: WebsiteObservedNode,
): string | null {
  const role = semanticRole(node);
  if (role === 'navigation') return 'Nav';
  const tagName = node.dom.tagName.toLowerCase();
  if (/^h[1-6]$/.test(tagName)) return 'Heading';
  return semanticComponentTypes.find(([name]) => name === tagName)?.[1] ?? null;
}

/*** Retains the first explicit DOM or rendered ARIA role without inventing semantics. */
function semanticRole(node: WebsiteObservedNode): string | null {
  const roles = [
    Object.hasOwn(node.dom.attributes, 'role') ? node.dom.attributes.role : null,
    ...node.observations.map((observation) => observation.semanticAttributes?.role),
  ];
  return roles.find((role): role is string => typeof role === 'string') ?? null;
}

const semanticComponentTypes = [
  ['a', 'Link'],
  ['address', 'RichText'],
  ['aside', 'Container'],
  ['article', 'Container'],
  ['audio', 'Media'],
  ['body', 'Container'],
  ['blockquote', 'RichText'],
  ['button', 'Button'],
  ['dd', 'ListItem'],
  ['details', 'Container'],
  ['dl', 'List'],
  ['dt', 'ListItem'],
  ['em', 'RichText'],
  ['footer', 'Footer'],
  ['form', 'Form'],
  ['figure', 'Container'],
  ['figcaption', 'RichText'],
  ['header', 'Header'],
  ['iframe', 'Media'],
  ['img', 'Image'],
  ['label', 'RichText'],
  ['li', 'ListItem'],
  ['main', 'Main'],
  ['menu', 'List'],
  ['nav', 'Nav'],
  ['ol', 'List'],
  ['p', 'RichText'],
  ['section', 'Section'],
  ['small', 'RichText'],
  ['strong', 'RichText'],
  ['summary', 'RichText'],
  ['ul', 'List'],
  ['video', 'Media'],
] as const;
