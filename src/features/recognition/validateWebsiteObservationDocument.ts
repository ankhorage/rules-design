import type {
  WebsiteObservationDocument,
  WebsitePageObservation,
} from '@ankhorage/contracts/website';

/*** Validates the identity and reference invariants required for deterministic recognition assembly. */
export function validateWebsiteObservationDocument(document: WebsiteObservationDocument): void {
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
