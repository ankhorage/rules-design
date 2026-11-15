/*** Maps explicit HTML semantics without relying on framework or page-builder selectors. */
export function recognizeWebsiteStructureSemanticComponentType(tagName: string): string | null {
  if (/^h[1-6]$/.test(tagName)) return 'Heading';
  return semanticComponentTypes.find(([name]) => name === tagName)?.[1] ?? null;
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
  ['main', 'Container'],
  ['menu', 'List'],
  ['nav', 'Container'],
  ['ol', 'List'],
  ['p', 'RichText'],
  ['section', 'Section'],
  ['small', 'RichText'],
  ['strong', 'RichText'],
  ['summary', 'RichText'],
  ['ul', 'List'],
  ['video', 'Media'],
] as const;
