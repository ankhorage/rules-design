import type { WebsiteRecognitionDocument } from '@ankhorage/contracts/website';
import { isRecord } from '@ankhorage/utility/object';

/*** Validates the canonical recognition envelope before a delivery adapter reads its derived data. */
export function validateWebsiteRecognitionDocument(
  document: unknown,
): asserts document is WebsiteRecognitionDocument {
  if (!isRecord(document) || document.schemaVersion !== 1)
    throw new TypeError('Unsupported website recognition schema.');
  if (!isNonEmptyString(document.documentId) || !isNonEmptyString(document.observedDocumentId))
    throw new TypeError('Website recognition document identity is required.');
  if (document.documentId !== `recognition:${document.observedDocumentId}`)
    throw new TypeError('Website recognition document identity is not canonical.');
  if (!isNonEmptyString(document.recognizedAt))
    throw new TypeError('Website recognition timestamp is required.');
  assertSource(document.source);
  assertSite(document.site);
  assertRecognitionPages(document.pages);
  assertDesignTokens(document.designTokens);
  assertRecords(document.navigation, 'Website recognition navigation');
  assertRecords(document.media, 'Website recognition media');
}

/*** Validates complete source metadata shared by every canonical website document. */
function assertSource(value: unknown): void {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.crawlerId) ||
    !isNonEmptyString(value.crawlerVersion) ||
    !isNonEmptyString(value.crawlId) ||
    (value.revision !== null && typeof value.revision !== 'string')
  ) {
    throw new TypeError('Website recognition source metadata is incomplete.');
  }
}

/*** Validates complete site metadata shared by every canonical website document. */
function assertSite(value: unknown): void {
  if (!isRecord(value) || !isNonEmptyString(value.id) || !isNonEmptyString(value.url))
    throw new TypeError('Website recognition site metadata is incomplete.');
}

/*** Validates the structural page boundary needed to recognize a document rather than an array of tokens. */
function assertRecognitionPages(value: unknown): void {
  assertRecords(value, 'Website recognition pages');
  if (
    !value.every(
      (page) =>
        isNonEmptyString(page.id) &&
        isNonEmptyString(page.url) &&
        typeof page.path === 'string' &&
        isRecord(page.root) &&
        Array.isArray(page.nodes),
    )
  ) {
    throw new TypeError('Website recognition page structure is incomplete.');
  }
  if (new Set(value.map((page) => page.id)).size !== value.length)
    throw new TypeError('Duplicate recognition page id.');
}

/*** Validates each derived token retains its canonical identity, kind, and source evidence. */
function assertDesignTokens(value: unknown): void {
  assertRecords(value, 'Website recognition designTokens');
  if (
    !value.every(
      (token) =>
        isNonEmptyString(token.id) &&
        (token.kind === 'color' ||
          token.kind === 'radius' ||
          token.kind === 'shadow' ||
          token.kind === 'spacing' ||
          token.kind === 'typography') &&
        Array.isArray(token.originalValues) &&
        Array.isArray(token.sourceRefs) &&
        token.sourceRefs.every(isNonEmptyString),
    )
  ) {
    throw new TypeError('Website recognition design token structure is incomplete.');
  }
}

/*** Narrows one document collection to records before its members are inspected. */
function assertRecords(
  value: unknown,
  label: string,
): asserts value is readonly Record<string, unknown>[] {
  if (!Array.isArray(value) || !value.every(isRecord))
    throw new TypeError(`${label} must be an array.`);
}

/*** Checks an identity value without accepting empty string placeholders. */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}
