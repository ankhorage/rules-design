import type { SerializableValue } from '@ankhorage/contracts';
import type { WebsiteRecognizedProp } from '@ankhorage/contracts/website';

/*** Qualifies nested structural source evidence so equal DOM paths remain page-unique. */
export function qualifyWebsiteRecognitionProps(
  property: WebsiteRecognizedProp,
  pageId: string,
): WebsiteRecognizedProp {
  return {
    ...property,
    originalValues: property.originalValues.map((value) => qualifySourceReferences(value, pageId)),
    value: qualifySourceReferences(property.value, pageId),
  };
}

/*** Qualifies the source references in a structural property list without altering observed literals. */
function qualifySourceReferences(value: SerializableValue, pageId: string): SerializableValue {
  if (!isSerializableArray(value)) return value;
  return value.map((item) =>
    isSourceReference(item)
      ? { ...item, sourceRef: JSON.stringify([pageId, item.sourceRef]) }
      : item,
  );
}

/*** Narrows a serializable value to its immutable list representation. */
function isSerializableArray(value: SerializableValue): value is readonly SerializableValue[] {
  return Array.isArray(value);
}

/*** Narrows the portable source-linked records used by structural text, link, and media props. */
function isSourceReference(
  value: SerializableValue,
): value is Readonly<Record<string, SerializableValue>> & { readonly sourceRef: string } {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    'sourceRef' in value &&
    typeof value.sourceRef === 'string'
  );
}
