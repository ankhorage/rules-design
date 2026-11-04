/***
 * Register the Design provider with the generic Rules evaluator.
 *
 * @title Evaluate Design Evidence
 * @usage
 * @readme
 */
import { createRuleRegistry, evaluateRules } from '@ankhorage/rules';
import { designRuleProvider } from '@ankhorage/rules-design';

const registry = createRuleRegistry([designRuleProvider.ruleSet]);
const result = evaluateRules({ evidence: [] }, registry.rules, {
  scope: { id: 'example-design', kind: 'design' },
});

console.log(result.findings);
