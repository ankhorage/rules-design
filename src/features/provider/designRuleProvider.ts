import type { Rule, RuleSet } from '@ankhorage/rules';

import type {
  DesignContext,
  DesignRuleProvider,
  DesignRuleProviderOptions,
} from '../../types/designRuleProvider.js';
import { createAccessibilityRules } from '../accessibility/createAccessibilityRules.js';
import { createAlignmentRules } from '../alignment/createAlignmentRules.js';
import { createColorRuleSet } from '../color/createColorRuleSet.js';
import { createContrastRules } from '../contrast/createContrastRules.js';
import { createMediaRuleSet } from '../media/createMediaRuleSet.js';
import { createRepetitionRules } from '../repetition/createRepetitionRules.js';
import { createResponsiveRules } from '../responsive/createResponsiveRules.js';
import { createSpacingProximityRuleSet } from '../spacing-proximity/createSpacingProximityRuleSet.js';
import { createTypographyRuleSet } from '../typography/createTypographyRuleSet.js';
import { createDesignCrapRules } from './createDesignCrapRules.js';

/*** Creates the complete registered Design provider from its explicit group-local policies. */
export function createDesignRuleProvider(options: DesignRuleProviderOptions): DesignRuleProvider {
  const atomicRules = createAtomicRules(options);
  return {
    id: 'ankhorage.rules-design',
    packageName: '@ankhorage/rules-design',
    ruleSet: {
      id: 'ankhorage.rules-design',
      rules: [...atomicRules, ...createDesignCrapRules(atomicRules)],
    },
  };
}

/*** Collects each independently owned atomic contribution at the central registration boundary. */
function createAtomicRules(options: DesignRuleProviderOptions): readonly Rule<DesignContext>[] {
  const ruleSets: readonly RuleSet<DesignContext>[] = [
    createColorRuleSet(options.color),
    { id: 'ankhorage.rules-design.contrast', rules: createContrastRules() },
    createTypographyRuleSet(options.typography),
    createSpacingProximityRuleSet(),
    { id: 'ankhorage.rules-design.alignment', rules: createAlignmentRules(options.alignment) },
    { id: 'ankhorage.rules-design.repetition', rules: createRepetitionRules() },
    { id: 'ankhorage.rules-design.responsive', rules: createResponsiveRules() },
    { id: 'ankhorage.rules-design.accessibility', rules: createAccessibilityRules() },
    createMediaRuleSet(options.media),
  ];
  return ruleSets.flatMap((ruleSet) => ruleSet.rules);
}
