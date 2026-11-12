# Public API

## createDesignRuleProvider

Kind: `function`
Module: `src/features/provider/designRuleProvider.ts`
Source: `src/features/provider/designRuleProvider.ts:20:1`

Creates the complete registered Design provider from its explicit group-local policies.

### Signatures

- `(options: DesignRuleProviderOptions) => DesignRuleProvider`
  - options: `DesignRuleProviderOptions`
  - returns: `DesignRuleProvider`

## createWebsiteAssessmentRuleSet

Kind: `function`
Module: `src/features/website-assessment/createWebsiteAssessmentRuleSet.ts`
Source: `src/features/website-assessment/createWebsiteAssessmentRuleSet.ts:14:1`

Creates the separately composable follow-on website and contact assessment rules.

### Signatures

- `(options?: WebsiteAssessmentRuleOptions) => RuleSet<WebsiteAssessmentContext>`
  - options: `WebsiteAssessmentRuleOptions` (optional)
  - returns: `RuleSet<WebsiteAssessmentContext>`

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
| facts | property | `readonly FactEnvelope[]` | yes |  |

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

## DesignRuleProfileSelection

Kind: `type`
Module: `src/types/designRuleProvider.ts`
Source: `src/types/designRuleProvider.ts:30:1`

Maps a named Design profile to the generic Rules engine selection contract.

### Members

| Name | Kind | Type | Required | Description |
| --- | --- | --- | --- | --- |
| profileId | property | `string` | yes |  |
| selection | property | `RuleSelection` | yes |  |

## DesignRuleProvider

Kind: `type`
Module: `src/types/designRuleProvider.ts`
Source: `src/types/designRuleProvider.ts:23:1`

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
Source: `src/features/catalog/designRuleProviderManifest.ts:5:14`

Declares every central-provider rule identity published through the released package surface.

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

## DesignRuleProviderOptions

Kind: `type`
Module: `src/types/designRuleProvider.ts`
Source: `src/types/designRuleProvider.ts:15:1`

Configures the group-local policy needed to create one complete Design provider.

### Members

| Name | Kind | Type | Required | Description |
| --- | --- | --- | --- | --- |
| alignment | property | `AlignmentRuleOptions \| undefined` | no |  |
| color | property | `ColorRulePolicy` | yes |  |
| media | property | `MediaRuleOptions \| undefined` | no |  |
| typography | property | `TypographyRulePolicy` | yes |  |

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

## recognizeWebsiteDesignProperties

Kind: `function`
Module: `src/features/recognition/recognizeWebsiteDesignProperties.ts`
Source: `src/features/recognition/recognizeWebsiteDesignProperties.ts:18:1`

Recognizes exact design properties from validated website observations without evaluating them.

### Signatures

- `(document: WebsiteObservationDocument) => WebsiteDesignRecognition`
  - document: `WebsiteObservationDocument`
  - returns: `WebsiteDesignRecognition`

## recognizeWebsiteDocument

Kind: `function`
Module: `src/features/recognition/recognizeWebsiteDocument.ts`
Source: `src/features/recognition/recognizeWebsiteDocument.ts:27:1`

Assembles the public website recognition contract from structural and factual design recognition.

### Signatures

- `(document: WebsiteObservationDocument) => WebsiteRecognitionDocument`
  - document: `WebsiteObservationDocument`
  - returns: `WebsiteRecognitionDocument`

## recognizeWebsiteStructure

Kind: `function`
Module: `src/features/website-recognition/recognizeWebsiteStructure.ts`
Source: `src/features/website-recognition/recognizeWebsiteStructure.ts:15:1`

Recognizes source-linked canonical component trees from validated website observations.

### Signatures

- `(document: WebsiteObservationDocument) => readonly WebsitePageRecognition[]`
  - document: `WebsiteObservationDocument`
  - returns: `readonly WebsitePageRecognition[]`

## selectDesignRuleProfile

Kind: `function`
Module: `src/features/provider/selectDesignRuleProfile.ts`
Source: `src/features/provider/selectDesignRuleProfile.ts:7:1`

Resolves one named profile independently from the Rule IDs it selects.

### Signatures

- `(profileId: string) => DesignRuleProfileSelection`
  - profileId: `string`
  - returns: `DesignRuleProfileSelection`

## WebsiteAssessmentRuleOptions

Kind: `type`
Module: `src/types/websiteAssessment.ts`
Source: `src/types/websiteAssessment.ts:5:1`

Configures explicit policies for the independently composable website assessment RuleSet.

### Members

| Name | Kind | Type | Required | Description |
| --- | --- | --- | --- | --- |
| legalNoticePolicy | property | `"required" \| "not-required" \| undefined` | no |  |
| privacyNoticePolicy | property | `"required" \| "not-required" \| undefined` | no |  |
| referenceYear | property | `number \| undefined` | no |  |
| trackingConsentPolicy | property | `"ch-information-and-objection" \| "eu-eea-prior-consent" \| undefined` | no |  |

## WebsiteDesignNodeRecognition

Kind: `type`
Module: `src/types/websiteDesignRecognition.ts`
Source: `src/types/websiteDesignRecognition.ts:37:1`

Groups all factual design observations for one stable observed DOM node.

### Members

| Name | Kind | Type | Required | Description |
| --- | --- | --- | --- | --- |
| accessibility | property | `readonly WebsiteDesignPropertyObservation[]` | yes |  |
| colors | property | `readonly WebsiteDesignPropertyObservation[]` | yes |  |
| layout | property | `readonly WebsiteDesignPropertyObservation[]` | yes |  |
| media | property | `readonly WebsiteMediaReference[]` | yes |  |
| pageId | property | `string` | yes |  |
| responsive | property | `readonly WebsiteDesignPropertyObservation[]` | yes |  |
| sourceRef | property | `string` | yes |  |
| typography | property | `readonly WebsiteDesignPropertyObservation[]` | yes |  |
| unresolved | property | `readonly WebsiteDesignUnresolvedObservation[]` | yes |  |

## WebsiteDesignPropertyObservation

Kind: `type`
Module: `src/types/websiteDesignRecognition.ts`
Source: `src/types/websiteDesignRecognition.ts:15:1`

Describes one exact observed design value without assigning a quality verdict.

### Members

| Name | Kind | Type | Required | Description |
| --- | --- | --- | --- | --- |
| name | property | `string` | yes |  |
| pageId | property | `string` | yes |  |
| provenance | property | `WebsiteObservationProvenance` | yes |  |
| sourceRef | property | `string` | yes |  |
| stateId | property | `string` | yes |  |
| value | property | `SerializableValue` | yes |  |
| viewportId | property | `string` | yes |  |

## WebsiteDesignRecognition

Kind: `type`
Module: `src/types/websiteDesignRecognition.ts`
Source: `src/types/websiteDesignRecognition.ts:61:1`

Provides the factual design-property contribution for later website recognition assembly.

### Members

| Name | Kind | Type | Required | Description |
| --- | --- | --- | --- | --- |
| nodes | property | `readonly WebsiteDesignNodeRecognition[]` | yes |  |
| tokenCandidates | property | `readonly WebsiteDesignTokenCandidate[]` | yes |  |

## WebsiteDesignSourceReference

Kind: `type`
Module: `src/types/websiteDesignRecognition.ts`
Source: `src/types/websiteDesignRecognition.ts:9:1`

Identifies one observed DOM node within the page that owns its local source reference.

### Members

| Name | Kind | Type | Required | Description |
| --- | --- | --- | --- | --- |
| pageId | property | `string` | yes |  |
| sourceRef | property | `string` | yes |  |

## WebsiteDesignTokenCandidate

Kind: `type`
Module: `src/types/websiteDesignRecognition.ts`
Source: `src/types/websiteDesignRecognition.ts:50:1`

Records a repeated observed value as a reusable token candidate without inventing a role.

### Members

| Name | Kind | Type | Required | Description |
| --- | --- | --- | --- | --- |
| confidence | property | `number` | yes |  |
| inferredRole | property | `null` | yes |  |
| kind | property | `"color" \| "radius" \| "shadow" \| "spacing" \| "typography"` | yes |  |
| originalValues | property | `readonly string[]` | yes |  |
| property | property | `string` | yes |  |
| sourceRefs | property | `readonly WebsiteDesignSourceReference[]` | yes |  |
| value | property | `string` | yes |  |

## WebsiteDesignUnresolvedObservation

Kind: `type`
Module: `src/types/websiteDesignRecognition.ts`
Source: `src/types/websiteDesignRecognition.ts:26:1`

Retains an unavailable observation instead of substituting or silently omitting design evidence.

### Members

| Name | Kind | Type | Required | Description |
| --- | --- | --- | --- | --- |
| kind | property | `"computed-css" \| "geometry"` | yes |  |
| missing | property | `WebsiteMissingValue` | yes |  |
| pageId | property | `string` | yes |  |
| provenance | property | `WebsiteObservationProvenance` | yes |  |
| sourceRef | property | `string` | yes |  |
| stateId | property | `string` | yes |  |
| viewportId | property | `string` | yes |  |
