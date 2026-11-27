import type { DesignRulePlanningManifest } from '../../../types/designRuleCatalog.js';
import { designRuleCatalog } from '../designRuleCatalog.js';
import { designRuleProfiles } from '../designRuleProfiles.js';

/*** Provides the internal Wave 0 planning manifest without claiming a provider implementation. */
export const designRulePlanningManifest: DesignRulePlanningManifest = {
  profiles: designRuleProfiles,
  rules: designRuleCatalog,
  schemaVersion: '1',
};
