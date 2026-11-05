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
    (fact): fact is AvailableResponsiveFact =>
      fact.status === 'available' &&
      fact.kind === 'design.responsive.viewport-matrix' &&
      fact.scope.id === scope.id &&
      fact.scope.kind === scope.kind,
  );
  return matches.length === 1 ? (matches[0] ?? null) : null;
}
