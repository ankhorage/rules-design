import type { RepetitionRuleFact } from '../../src/features/repetition/createRepetitionRules';

export const repetitionScope = { id: 'checkout-summary', kind: 'component' };

export function createRepetitionRuleFact(
  ruleId: RepetitionRuleFact['ruleId'],
  actual: RepetitionRuleFact['actual'],
  expected: RepetitionRuleFact['expected'] = actual,
): RepetitionRuleFact {
  return {
    actual,
    expected,
    id: `${ruleId}:checkout-summary`,
    ruleId,
    scope: repetitionScope,
    subject: { id: 'checkout-summary', kind: 'component' },
  };
}
