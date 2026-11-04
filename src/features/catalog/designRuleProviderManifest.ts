import type { DesignRuleProviderManifest } from '../../types/designRuleCatalog';

/*** Declares the released MIT provider surface without exposing unclassified planned rules. */
export const designRuleProviderManifest: DesignRuleProviderManifest = {
  packageName: '@ankhorage/rules-design',
  providerId: 'ankhorage.rules-design',
  publishedRuleIds: [],
  schemaVersion: '1',
};
