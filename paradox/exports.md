# Public API

## DesignAssessmentKind

Kind: `unknown`
Module: `src/types/designRuleCatalog.ts`
Source: `src/types/designRuleCatalog.ts:1:1`

## DesignContext

Kind: `type`
Module: `src/types/designRuleProvider.ts`
Source: `src/types/designRuleProvider.ts:10:1`

The minimal context shared by Design rules without prescribing its source.

### Members

| Name | Kind | Type | Required | Description |
| --- | --- | --- | --- | --- |
| evidence | property | `readonly DesignEvidence[]` | yes |  |

## DesignEvidence

Kind: `type`
Module: `src/types/designRuleProvider.ts`
Source: `src/types/designRuleProvider.ts:4:1`

One provider-neutral design observation supplied by a Design context.

### Members

| Name | Kind | Type | Required | Description |
| --- | --- | --- | --- | --- |
| id | property | `string` | yes |  |
| kind | property | `string` | yes |  |

## designRuleCatalog

Kind: `value`
Module: `src/features/catalog/designRuleCatalog.ts`
Source: `src/features/catalog/designRuleCatalog.ts:220:14`

Exposes the complete planned atomic and composite design rule catalog.

## DesignRuleCatalogEntry

Kind: `type`
Module: `src/types/designRuleCatalog.ts`
Source: `src/types/designRuleCatalog.ts:11:1`

### Members

| Name | Kind | Type | Required | Description |
| --- | --- | --- | --- | --- |
| assessmentKind | property | `DesignAssessmentKind` | yes |  |
| dependencies | property | `readonly string[]` | yes |  |
| description | property | `string` | yes |  |
| evidenceSchemaVersion | property | `"1"` | yes |  |
| expectedEvidence | property | `DesignRuleEvidence` | yes |  |
| facets | property | `{ readonly principles: readonly string[]; readonly scopes: readonly DesignRuleScope[]; readonly subjects: readonly string[]; readonly topics: readonly string[]; }` | yes |  |
| group | property | `string` | yes |  |
| id | property | `string` | yes |  |
| name | property | `string` | yes |  |
| requiredCapabilities | property | `readonly string[]` | yes |  |
| semanticsVersion | property | `"1"` | yes |  |
| severity | property | `"advisory" \| "required"` | yes |  |
| status | property | `"planned"` | yes |  |

## DesignRuleCatalogFilter

Kind: `unknown`
Module: `src/types/designRuleCatalog.ts`
Source: `src/types/designRuleCatalog.ts:32:1`

## DesignRuleEvidence

Kind: `type`
Module: `src/types/designRuleCatalog.ts`
Source: `src/types/designRuleCatalog.ts:5:1`

### Members

| Name | Kind | Type | Required | Description |
| --- | --- | --- | --- | --- |
| assertion | property | `string` | yes |  |
| observations | property | `readonly string[]` | yes |  |
| source | property | `string` | yes |  |

## DesignRulePlanningManifest

Kind: `type`
Module: `src/types/designRuleCatalog.ts`
Source: `src/types/designRuleCatalog.ts:42:1`

### Members

| Name | Kind | Type | Required | Description |
| --- | --- | --- | --- | --- |
| profiles | property | `readonly DesignRuleProfile[]` | yes |  |
| rules | property | `readonly DesignRuleCatalogEntry[]` | yes |  |
| schemaVersion | property | `"1"` | yes |  |

## DesignRuleProfile

Kind: `type`
Module: `src/types/designRuleCatalog.ts`
Source: `src/types/designRuleCatalog.ts:36:1`

### Members

| Name | Kind | Type | Required | Description |
| --- | --- | --- | --- | --- |
| description | property | `string` | yes |  |
| id | property | `string` | yes |  |
| rootRuleIds | property | `readonly string[]` | yes |  |

## designRuleProfiles

Kind: `value`
Module: `src/features/catalog/designRuleProfiles.ts`
Source: `src/features/catalog/designRuleProfiles.ts:9:14`

Declares selectable profiles without adding another executable or composite rule.

| description | id | root rule ids |
| --- | --- | --- |
| Objective baseline design checks. | design.quality.base |  |
| Advisory accessibility-oriented checks. | design.wcag.advisory |  |
| C.R.A.P. composition profile. | design.crap | design.crap |
| Advisory 60-30-10 visible color-area distribution profile. | design.60-30-10 | design.color.usage-distribution |

## designRuleProvider

Kind: `value`
Module: `src/features/provider/designRuleProvider.ts`
Source: `src/features/provider/designRuleProvider.ts:4:14`

Exposes the reusable Design provider through the generic Rules RuleSet contract.

## DesignRuleProvider

Kind: `type`
Module: `src/types/designRuleProvider.ts`
Source: `src/types/designRuleProvider.ts:15:1`

The public identity and generic Rules contribution for the Design provider.

### Members

| Name | Kind | Type | Required | Description |
| --- | --- | --- | --- | --- |
| id | property | `"ankhorage.rules-design"` | yes |  |
| packageName | property | `"@ankhorage/rules-design"` | yes |  |
| ruleSet | property | `RuleSet<DesignContext>` | yes |  |

## designRuleProviderManifest

Kind: `value`
Module: `src/features/catalog/designRuleProviderManifest.ts`
Source: `src/features/catalog/designRuleProviderManifest.ts:4:14`

Declares the released MIT provider surface without exposing unclassified planned rules.

## DesignRuleProviderManifest

Kind: `type`
Module: `src/types/designRuleCatalog.ts`
Source: `src/types/designRuleCatalog.ts:48:1`

### Members

| Name | Kind | Type | Required | Description |
| --- | --- | --- | --- | --- |
| packageName | property | `"@ankhorage/rules-design"` | yes |  |
| providerId | property | `"ankhorage.rules-design"` | yes |  |
| publishedRuleIds | property | `readonly string[]` | yes |  |
| schemaVersion | property | `"1"` | yes |  |

## DesignRuleScope

Kind: `unknown`
Module: `src/types/designRuleCatalog.ts`
Source: `src/types/designRuleCatalog.ts:3:1`

## DesignRuleStatus

Kind: `unknown`
Module: `src/types/designRuleCatalog.ts`
Source: `src/types/designRuleCatalog.ts:2:1`

## filterDesignRuleCatalog

Kind: `function`
Module: `src/features/catalog/filterDesignRuleCatalog.ts`
Source: `src/features/catalog/filterDesignRuleCatalog.ts:7:1`

Selects planned catalog entries matching every supplied controlled facet.

### Signatures

- `(entries: readonly DesignRuleCatalogEntry[], filter: Partial<Pick<{ readonly principles: readonly string[]; readonly scopes: readonly import("../..").DesignRuleScope[]; readonly subjects: readonly string[]; readonly topics: readonly string[]; }, "principles" | "scopes" | "subjects" | "topics">>) => readonly DesignRuleCatalogEntry[]`
  - entries: `readonly DesignRuleCatalogEntry[]`
  - filter: `Partial<Pick<{ readonly principles: readonly string[]; readonly scopes: readonly import("../..").DesignRuleScope[]; readonly subjects: readonly string[]; readonly topics: readonly string[]; }, "principles" | "scopes" | "subjects" | "topics">>`
  - returns: `readonly DesignRuleCatalogEntry[]`
