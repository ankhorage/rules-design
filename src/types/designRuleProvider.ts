import type { FactEnvelope } from '@ankhorage/contracts/rules';
import type { RuleSelection, RuleSet } from '@ankhorage/rules';

import type { AlignmentRuleOptions } from '../features/alignment/createAlignmentRules';
import type { ColorRulePolicy } from '../features/color/createColorRuleSet';
import type { MediaRuleOptions } from '../features/media/createMediaRuleSet';
import type { TypographyRulePolicy } from './typography';

/*** The minimal context shared by Design rules without prescribing its source. */
export interface DesignContext {
  readonly facts: readonly FactEnvelope[];
}

/*** Configures the group-local policy needed to create one complete Design provider. */
export interface DesignRuleProviderOptions {
  readonly alignment?: AlignmentRuleOptions;
  readonly color: ColorRulePolicy;
  readonly media?: MediaRuleOptions;
  readonly typography: TypographyRulePolicy;
}

/*** The public identity and generic Rules contribution for the Design provider. */
export interface DesignRuleProvider {
  readonly id: 'ankhorage.rules-design';
  readonly packageName: '@ankhorage/rules-design';
  readonly ruleSet: RuleSet<DesignContext>;
}

/*** Maps a named Design profile to the generic Rules engine selection contract. */
export interface DesignRuleProfileSelection {
  readonly profileId: string;
  readonly selection: RuleSelection;
}
