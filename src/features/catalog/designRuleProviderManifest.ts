import type { DesignRuleProviderManifest } from '../../types/designRuleCatalog';
import { designRuleCatalog } from './designRuleCatalog';

/*** Declares every central-provider rule identity published through the released package surface. */
export const designRuleProviderManifest: DesignRuleProviderManifest = {
  packageName: '@ankhorage/rules-design',
  providerId: 'ankhorage.rules-design',
  publishedRuleIds: designRuleCatalog.map((entry) => entry.id),
  schemaVersion: '1',
};
