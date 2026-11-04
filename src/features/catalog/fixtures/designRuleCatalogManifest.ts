import type { DesignRuleCatalogManifest } from "../../../types/designRuleCatalog";
import { designRuleCatalog } from "../designRuleCatalog";
import { designRuleProfiles } from "../designRuleProfiles";

/*** Provides the machine-readable Wave 0 catalog fixture for downstream contract tests. */
export const designRuleCatalogManifest: DesignRuleCatalogManifest = {
  profiles: designRuleProfiles,
  rules: designRuleCatalog,
  schemaVersion: "1",
};
