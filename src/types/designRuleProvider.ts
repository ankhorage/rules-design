import type { FactEnvelope } from '@ankhorage/contracts/rules';
import type { RuleSet } from '@ankhorage/rules';

export type DesignColorPolicyRuleId =
  | 'design.color.active-state'
  | 'design.color.alpha-composition'
  | 'design.color.disabled-state'
  | 'design.color.hover-state'
  | 'design.color.literal-drift'
  | 'design.color.ramp-consistency'
  | 'design.color.semantic-role'
  | 'design.color.surface-role'
  | 'design.color.syntax-valid'
  | 'design.color.theme-coverage'
  | 'design.color.token-allowed'
  | 'design.color.token-exists';
export type DesignColorUsageScope = 'page' | 'scroll-sample' | 'viewport';
/*** The provider-neutral facts supplied to Design rules by an outer observation adapter. */
export interface DesignContext {
  readonly evidence: readonly DesignEvidence[];
  readonly facts?: readonly FactEnvelope[];
}
/*** One provider-neutral design observation supplied by a Design context. */
export interface DesignEvidence {
  readonly id: string;
  readonly kind: string;
}
/*** The public identity and generic Rules contribution for the Design provider. */
export interface DesignRuleProvider {
  readonly id: 'ankhorage.rules-design';
  readonly packageName: '@ankhorage/rules-design';
  readonly ruleSet: RuleSet<DesignContext>;
}
