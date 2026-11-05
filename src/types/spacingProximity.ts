/*** The frozen rule IDs owned by the Spacing and Proximity rule group. */
export type SpacingProximityRuleId =
  | 'design.proximity.card-internals'
  | 'design.proximity.heading-content'
  | 'design.proximity.label-control'
  | 'design.proximity.related-grouping'
  | 'design.proximity.unrelated-separation'
  | 'design.spacing.container-padding'
  | 'design.spacing.double-application'
  | 'design.spacing.section-gap'
  | 'design.spacing.token-allowed'
  | 'design.spacing.unexpected-collapse'
  | 'design.spacing.vertical-rhythm';

/*** One normalized raw observation supplied by a layout or token adapter. */
export interface SpacingProximityObservation {
  readonly kind: SpacingProximityRuleId;
  readonly value: unknown;
}
