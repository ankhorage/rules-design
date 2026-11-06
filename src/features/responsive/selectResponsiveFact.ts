import type { FactEnvelope } from '@ankhorage/contracts/rules';
import type { RuleScope } from '@ankhorage/rules';

type AvailableResponsiveFact = Extract<FactEnvelope, { readonly status: 'available' }> & {
  readonly kind: 'design.responsive.viewport-matrix';
};

/*** Selects exactly one available responsive matrix fact at the active Rules scope. */
export function selectResponsiveFact(
  facts: readonly FactEnvelope[],
  scope: RuleScope,
): AvailableResponsiveFact | null {
  const matches = facts.filter(
    (fact) =>
      fact.kind === 'design.responsive.viewport-matrix' &&
      fact.scope.id === scope.id &&
      fact.scope.kind === scope.kind,
  );
  const [fact] = matches;
  return matches.length === 1 && isAvailableResponsiveFact(fact) ? fact : null;
}

/*** Identifies the one scoped responsive matrix that can be evaluated. */
function isAvailableResponsiveFact(
  fact: FactEnvelope | undefined,
): fact is AvailableResponsiveFact {
  return fact?.status === 'available' && fact.kind === 'design.responsive.viewport-matrix';
}
