/*** Declares the fixed Images and Media catalog entries owned by this rule group. */
const definitions: readonly (readonly [string, string, number?])[] = [
  ['design.media.aspect-ratio', 'Require configured media aspect ratios.'],
  ['design.media.intrinsic-size', 'Require known positive intrinsic media dimensions.'],
  ['design.media.resolution-fit', 'Require media resolution suitable for rendered bounds.'],
  ['design.media.object-fit', 'Require configured object fitting.'],
  ['design.media.focal-point', 'Preserve declared focal points after cropping.'],
  ['design.media.responsive-sources', 'Require responsive media sources when assessed.'],
  ['design.media.overlay-legibility', 'Require sufficient measured overlay contrast.', 4.5],
  ['design.media.icon-sizing', 'Require configured icon sizing.'],
  [
    'design.media.decorative-vs-content',
    'Require media classification to agree with its accessible name.',
  ],
];

/*** Declares the fixed Images and Media catalog entries owned by this rule group. */
export const mediaRuleDefinitions: readonly MediaRuleDefinition[] = definitions.map(
  ([id, summary, minimumContrastRatio]) => ({ id, minimumContrastRatio, summary }),
);

export interface MediaRuleDefinition {
  readonly id: string;
  readonly minimumContrastRatio?: number;
  readonly summary: string;
}
