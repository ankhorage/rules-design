import type { RuleSelection } from '@ankhorage/rules';

import type { DesignRuleProfileSelection } from '../../types/designRuleProvider';
import { designRuleProfiles } from '../catalog/designRuleProfiles';

/*** Resolves one named profile independently from the Rule IDs it selects. */
export function selectDesignRuleProfile(profileId: string): DesignRuleProfileSelection {
  const profile = designRuleProfiles.find((candidate) => candidate.id === profileId);
  if (profile === undefined) throw new RangeError(`Unknown Design profile: ${profileId}.`);
  return { profileId: profile.id, selection: selection(profile.rootRuleIds) };
}

/*** Creates a fresh generic selection so callers cannot mutate catalog-owned profile declarations. */
function selection(rootRuleIds: readonly string[]): RuleSelection {
  return { rootRuleIds: [...rootRuleIds] };
}
