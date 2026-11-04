import type { DesignRulePlanningManifest } from '../../../types/designRuleCatalog';
import { designRuleCatalog } from '../designRuleCatalog';
import { designRuleProfiles } from '../designRuleProfiles';

/*** Provides the internal Wave 0 planning manifest without claiming a provider implementation. */
export const designRulePlanningManifest: DesignRulePlanningManifest = {
  profiles: designRuleProfiles,
  rules: designRuleCatalog,
  schemaVersion: '1',
};
