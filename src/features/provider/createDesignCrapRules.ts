import type { Rule, RuleEvaluationInput, RuleEvaluationOutcome } from '@ankhorage/rules';

import type { DesignContext } from '../../types/designRuleProvider';

interface CrapDefinition {
  readonly dependencies: readonly string[];
  readonly id: string;
  readonly summary: string;
}

/*** Creates the five C.R.A.P. composition nodes from the registered atomic Design rules. */
export function createDesignCrapRules(
  atomicRules: readonly Rule<DesignContext>[],
): readonly Rule<DesignContext>[] {
  const atomicRuleIds = atomicRules.map((rule) => rule.identity.id);
  return crapDefinitions(atomicRuleIds).map(createDesignCrapRule);
}

/*** Declares C.R.A.P. dependencies from canonical atomic IDs without reimplementing group rules. */
function crapDefinitions(atomicRuleIds: readonly string[]): readonly CrapDefinition[] {
  const children = (prefixes: readonly string[]) =>
    atomicRuleIds.filter((id) => prefixes.some((prefix) => id.startsWith(prefix)));
  return [
    definition(
      'design.crap.contrast',
      children(['design.color.', 'design.contrast.']),
      'Compose Color and Contrast results into the C.R.A.P. contrast principle.',
    ),
    definition(
      'design.crap.repetition',
      children(['design.repetition.', 'design.typography.']),
      'Compose Repetition and Typography results into the C.R.A.P. repetition principle.',
    ),
    definition(
      'design.crap.alignment',
      children(['design.alignment.', 'design.layout.', 'design.responsive.']),
      'Compose Alignment, Layout, and Responsive results into the C.R.A.P. alignment principle.',
    ),
    definition(
      'design.crap.proximity',
      children(['design.spacing.', 'design.proximity.']),
      'Compose Spacing and Proximity results into the C.R.A.P. proximity principle.',
    ),
    definition(
      'design.crap',
      [
        'design.crap.contrast',
        'design.crap.repetition',
        'design.crap.alignment',
        'design.crap.proximity',
      ],
      'Compose exactly four C.R.A.P. principle results without calculating a design score.',
    ),
  ];
}

/*** Defines one stable composite identity and its evaluator-owned dependency edges. */
function definition(id: string, dependencies: readonly string[], summary: string): CrapDefinition {
  return { dependencies, id, summary };
}

/*** Adapts one declared C.R.A.P. node to the generic dependency-result contract. */
function createDesignCrapRule(definition: CrapDefinition): Rule<DesignContext> {
  return {
    defaultSeverity: 'warning',
    dependencies: definition.dependencies.map((ruleId) => ({ ruleId })),
    evaluate: (input) => evaluateDesignCrapRule(definition, input),
    identity: { id: definition.id, version: '1.0.0' },
    summary: definition.summary,
  };
}

/*** Reports failed child principles as advisory findings while the engine propagates incomplete ones. */
function evaluateDesignCrapRule(
  definition: CrapDefinition,
  input: RuleEvaluationInput<DesignContext>,
): RuleEvaluationOutcome {
  const failedChildren = input.dependencyResults.filter((result) => result.status === 'FAIL');
  return failedChildren.length === 0
    ? { findings: [], status: 'PASS' }
    : {
        findings: failedChildren.map((result) => ({
          evidence: { childRuleId: result.rule.id, childStatus: result.status },
          message: `${definition.id} includes a failed child rule: ${result.rule.id}.`,
          ruleId: definition.id,
          severity: 'warning',
          subjects: [{ id: input.scope.id, kind: input.scope.kind }],
        })),
        status: 'FAIL',
      };
}
