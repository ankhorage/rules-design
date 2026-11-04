export type DesignAssessmentKind = 'heuristic' | 'objective';
export type DesignRuleStatus = 'planned';
export type DesignRuleScope = 'component' | 'element' | 'page' | 'project' | 'site';

export interface DesignRuleEvidence {
  readonly assertion: string;
  readonly observations: readonly string[];
  readonly source: string;
}

export interface DesignRuleCatalogEntry {
  readonly assessmentKind: DesignAssessmentKind;
  readonly dependencies: readonly string[];
  readonly description: string;
  readonly evidenceSchemaVersion: '1';
  readonly expectedEvidence: DesignRuleEvidence;
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
  readonly semanticsVersion: '1';
  readonly severity: 'advisory' | 'required';
  readonly status: DesignRuleStatus;
}

export type DesignRuleCatalogFilter = Partial<
  Pick<DesignRuleCatalogEntry['facets'], 'principles' | 'scopes' | 'subjects' | 'topics'>
>;

export interface DesignRuleProfile {
  readonly description: string;
  readonly id: string;
  readonly rootRuleIds: readonly string[];
}

export interface DesignRulePlanningManifest {
  readonly profiles: readonly DesignRuleProfile[];
  readonly rules: readonly DesignRuleCatalogEntry[];
  readonly schemaVersion: '1';
}

export interface DesignRuleProviderManifest {
  readonly packageName: '@ankhorage/rules-design';
  readonly providerId: 'ankhorage.rules-design';
  readonly publishedRuleIds: readonly string[];
  readonly schemaVersion: '1';
}
