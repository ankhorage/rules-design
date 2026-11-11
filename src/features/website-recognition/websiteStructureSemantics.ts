/*** Maps explicit HTML semantics without relying on framework or page-builder selectors. */
export function recognizeWebsiteStructureSemanticComponentType(tagName: string): string | null {
  if (/^h[1-6]$/.test(tagName)) return 'Heading';
  return semanticComponentTypes.find(([name]) => name === tagName)?.[1] ?? null;
}

const semanticComponentTypes = [
  ['a', 'Link'],
  ['article', 'Container'],
  ['audio', 'Media'],
  ['body', 'Container'],
  ['blockquote', 'RichText'],
  ['button', 'Button'],
  ['footer', 'Footer'],
  ['form', 'Form'],
  ['header', 'Header'],
  ['iframe', 'Media'],
  ['img', 'Image'],
  ['label', 'RichText'],
  ['li', 'ListItem'],
  ['main', 'Container'],
  ['ol', 'List'],
  ['p', 'RichText'],
  ['section', 'Section'],
  ['ul', 'List'],
  ['video', 'Media'],
] as const;
