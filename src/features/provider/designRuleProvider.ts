import type { Rule } from '@ankhorage/rules';

import type { DesignContext, DesignRuleProvider } from '../../types/designRuleProvider';

const designEvidencePresentRule: Rule<DesignContext> = {
  defaultSeverity: 'warning',
  dependencies: [],
  evaluate: ({ context }) =>
    context.evidence.length > 0
      ? { findings: [], status: 'PASS' }
      : {
          findings: [
            {
              evidence: { evidenceCount: 0 },
              message: 'Design evaluation requires at least one supplied evidence item.',
              ruleId: 'ignored-by-engine',
              severity: 'info',
              subjects: [{ id: 'design-context', kind: 'design-context' }],
            },
          ],
          status: 'FAIL',
        },
  identity: { id: 'design.evidence.present', version: '1.0.0' },
  summary: 'Require supplied evidence before evaluating Design rules.',
};

/*** Exposes the reusable Design provider through the generic Rules RuleSet contract. */
export const designRuleProvider: DesignRuleProvider = {
  id: 'ankhorage.rules-design',
  packageName: '@ankhorage/rules-design',
  ruleSet: {
    id: 'ankhorage.rules-design',
    rules: [designEvidencePresentRule],
  },
};
