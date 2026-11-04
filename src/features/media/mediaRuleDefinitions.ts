/*** Declares the fixed Images and Media catalog entries owned by this rule group. */
export const mediaRuleDefinitions: readonly MediaRuleDefinition[] = [
  ['design.media.aspect-ratio', 'Require configured media aspect ratios.'],
  ['design.media.intrinsic-size', 'Require known positive intrinsic media dimensions.'],
  ['design.media.resolution-fit', 'Require media resolution suitable for rendered bounds.'],
  ['design.media.object-fit', 'Require configured object fitting.'],
  ['design.media.focal-point', 'Preserve declared focal points after cropping.'],
  ['design.media.responsive-sources', 'Require responsive media sources when assessed.'],
  ['design.media.overlay-legibility', 'Require sufficient measured overlay contrast.'],
  ['design.media.icon-sizing', 'Require configured icon sizing.'],
  [
    'design.media.decorative-vs-content',
    'Require media classification to agree with its accessible name.',
  ],
].map(([id, summary]) => ({ id, summary }));

export interface MediaRuleDefinition {
  readonly id: string;
  readonly summary: string;
}
