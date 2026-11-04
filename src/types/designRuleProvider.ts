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

export type DesignColorRole = 'accent' | 'base' | 'secondary' | 'unknown';
export type DesignColorUsageScope = 'page' | 'scroll-sample' | 'viewport';

export interface DesignColorPolicyFact {
  readonly evidence: {
    readonly actual: string;
    readonly expected: string;
  };
  readonly outcome: 'fail' | 'pass';
  readonly ruleId: DesignColorPolicyRuleId;
  readonly scopeId: string;
}

export interface DesignColorUsageDistributionFact {
  readonly breakpointId: string;
  readonly measuredPixels: number;
  readonly rolePixels: Readonly<Record<DesignColorRole, number>>;
  readonly scope: DesignColorUsageScope;
  readonly scopeId: string;
  readonly themeId: string;
  readonly unknownPixels: number;
}

/*** One provider-neutral design observation supplied by a Design context. */
export interface DesignEvidence {
  readonly id: string;
  readonly kind: string;
}

/*** The minimal context shared by Design rules without prescribing its source. */
export interface DesignContext {
  readonly colorPolicyFacts?: readonly DesignColorPolicyFact[];
  readonly colorUsageDistributionFacts?: readonly DesignColorUsageDistributionFact[];
  readonly evidence: readonly DesignEvidence[];
}

/*** The public identity and generic Rules contribution for the Design provider. */
export interface DesignRuleProvider {
  readonly id: 'ankhorage.rules-design';
  readonly packageName: '@ankhorage/rules-design';
  readonly ruleSet: RuleSet<DesignContext>;
}
