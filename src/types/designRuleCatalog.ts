export type DesignAssessmentKind = "heuristic" | "objective";
export type DesignRuleStatus = "planned";
export type DesignRuleScope =
  "component" | "element" | "page" | "project" | "site";

export type DesignRuleCatalogEntry = {
  readonly assessmentKind: DesignAssessmentKind;
  readonly dependencies: readonly string[];
  readonly description: string;
  readonly evidenceSchemaVersion: "1";
  readonly expectedEvidence: string;
  readonly facets: {
    readonly principles: readonly string[];
    readonly scopes: readonly DesignRuleScope[];
    readonly subjects: readonly string[];
    readonly topics: readonly string[];
  };
  readonly group: string;
  readonly id: string;
  readonly name: string;
  readonly requiredCapabilities: readonly string[];
  readonly severity: "advisory" | "required";
  readonly status: DesignRuleStatus;
};

export type DesignRuleCatalogFilter = Partial<
  Pick<
    DesignRuleCatalogEntry["facets"],
    "principles" | "scopes" | "subjects" | "topics"
  >
>;

export type DesignRuleProfile = {
  readonly description: string;
  readonly id: string;
  readonly rootRuleIds: readonly string[];
};

export type DesignRuleCatalogManifest = {
  readonly profiles: readonly DesignRuleProfile[];
  readonly rules: readonly DesignRuleCatalogEntry[];
  readonly schemaVersion: "1";
};
