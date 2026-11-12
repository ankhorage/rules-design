import type { WebsiteAsset, WebsiteObservationDocument } from '@ankhorage/contracts/website';

/*** Indexes globally named assets only after rejecting incompatible duplicate identities. */
export function createWebsiteAssetIndex(
  document: WebsiteObservationDocument,
): ReadonlyMap<string, WebsiteAsset> {
  return new Map(
    [
      ...Map.groupBy(
        document.pages.flatMap((page) => page.assets),
        (asset) => asset.id,
      ),
    ].map(([id, assets]) => {
      const [asset] = assets;
      if (
        assets.some(
          (candidate) =>
            candidate.url !== asset.url ||
            candidate.kind !== asset.kind ||
            candidate.contentType !== asset.contentType,
        )
      )
        throw new TypeError(`Conflicting asset identity ${id}.`);
      return [id, asset];
    }),
  );
}
