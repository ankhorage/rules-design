import type {
  WebsiteObservationDocument,
  WebsitePageObservation,
} from '@ankhorage/contracts/website';
import { isRecord } from '@ankhorage/utility/object';

/*** Validates the identity and reference invariants required for deterministic recognition assembly. */
export function validateWebsiteObservationDocument(document: WebsiteObservationDocument): void {
  assertObservationEnvelope(document);
  const schemaVersion: number = document.schemaVersion;
  if (schemaVersion !== 1) throw new TypeError('Unsupported website observation schema.');
  if (document.documentId.length === 0)
    throw new TypeError('Website observation documentId is required.');
  unique(
    document.pages.map((page) => page.id),
    'page id',
  );
  document.pages.forEach(validatePage);
}

/*** Validates the complete observation envelope before recognition accesses nested page evidence. */
function assertObservationEnvelope(
  document: unknown,
): asserts document is WebsiteObservationDocument {
  if (!isRecord(document) || document.schemaVersion !== 1)
    throw new TypeError('Unsupported website observation schema.');
  if (!isNonEmptyString(document.documentId) || !isNonEmptyString(document.collectedAt))
    throw new TypeError('Website observation document identity is required.');
  assertSource(document.source);
  assertSite(document.site);
  assertObservationPages(document.pages);
}

/*** Validates the immutable producer metadata required to attribute an observation document. */
function assertSource(value: unknown): void {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.crawlerId) ||
    !isNonEmptyString(value.crawlerVersion) ||
    !isNonEmptyString(value.crawlId) ||
    (value.revision !== null && typeof value.revision !== 'string')
  ) {
    throw new TypeError('Website observation source metadata is incomplete.');
  }
}

/*** Validates the stable site metadata required to scope an observation document. */
function assertSite(value: unknown): void {
  if (!isRecord(value) || !isNonEmptyString(value.id) || !isNonEmptyString(value.url))
    throw new TypeError('Website observation site metadata is incomplete.');
}

/*** Validates page collection boundaries before existing page-reference invariants run. */
function assertObservationPages(
  value: unknown,
): asserts value is readonly WebsitePageObservation[] {
  if (!Array.isArray(value) || !value.every(isObservationPage))
    throw new TypeError('Website observation pages are incomplete.');
}

/*** Validates all page collections read by the recognition algorithm without reimplementing recognition. */
function isObservationPage(value: unknown): value is WebsitePageObservation {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.url) &&
    typeof value.path === 'string' &&
    Array.isArray(value.navigation) &&
    Array.isArray(value.viewports) &&
    Array.isArray(value.states) &&
    Array.isArray(value.nodes) &&
    Array.isArray(value.assets)
  );
}

/*** Checks an identity value without accepting empty string placeholders. */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/*** Validates page-local references without rejecting malformed hierarchy evidence that recognition must retain. */
function validatePage(page: WebsitePageObservation): void {
  unique(
    page.nodes.map((node) => node.sourceRef),
    `source reference on page ${page.id}`,
  );
  unique(
    page.viewports.map((viewport) => viewport.id),
    `viewport id on page ${page.id}`,
  );
  unique(
    page.states.map((state) => state.id),
    `state id on page ${page.id}`,
  );
  const viewportIds = new Set(page.viewports.map((viewport) => viewport.id));
  const stateIds = new Set(page.states.map((state) => state.id));
  page.nodes.forEach((node) =>
    node.observations.forEach((observation) => {
      if (!viewportIds.has(observation.viewportId))
        throw new TypeError(`Unknown viewport ${observation.viewportId} on page ${page.id}.`);
      if (!stateIds.has(observation.stateId))
        throw new TypeError(`Unknown state ${observation.stateId} on page ${page.id}.`);
    }),
  );
}

/*** Rejects ambiguous identities before a Map could silently overwrite an observation. */
function unique(values: readonly string[], label: string): void {
  if (new Set(values).size !== values.length) throw new TypeError(`Duplicate ${label}.`);
}
