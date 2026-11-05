import type { FactEnvelope } from '@ankhorage/contracts/rules';
import type { RuleSet } from '@ankhorage/rules';

/*** One provider-neutral design observation supplied by a Design context. */
export interface DesignEvidence {
  readonly id: string;
  readonly kind: string;
}

/*** The minimal context shared by Design rules without prescribing its source. */
export interface DesignContext {
  readonly evidence: readonly DesignEvidence[];
  readonly facts?: readonly FactEnvelope[];
}

/*** The public identity and generic Rules contribution for the Design provider. */
export interface DesignRuleProvider {
  readonly id: 'ankhorage.rules-design';
  readonly packageName: '@ankhorage/rules-design';
  readonly ruleSet: RuleSet<DesignContext>;
}
