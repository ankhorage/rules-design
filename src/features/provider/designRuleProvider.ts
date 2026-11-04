import type { DesignRuleProvider } from '../../types/designRuleProvider';

/*** Exposes the reusable Design provider through the generic Rules RuleSet contract. */
export const designRuleProvider: DesignRuleProvider = {
  id: 'ankhorage.rules-design',
  packageName: '@ankhorage/rules-design',
  ruleSet: {
    id: 'ankhorage.rules-design',
    rules: [],
  },
};
