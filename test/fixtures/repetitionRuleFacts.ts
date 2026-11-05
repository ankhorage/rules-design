import type { AvailableFactEnvelope, MissingFactEnvelope } from '@ankhorage/contracts/rules';
import type { JsonValue } from '@ankhorage/rules';

type RepetitionRuleId =
  | 'design.repetition.button-variants'
  | 'design.repetition.card-variants'
  | 'design.repetition.heading-variants'
  | 'design.repetition.form-control-style'
  | 'design.repetition.link-treatment'
  | 'design.repetition.navigation-treatment'
  | 'design.repetition.icons'
  | 'design.repetition.border-radius'
  | 'design.repetition.border-weight'
  | 'design.repetition.elevation'
  | 'design.repetition.motion'
  | 'design.repetition.local-overrides'
  | 'design.repetition.template-drift';

export const repetitionScope = { id: 'checkout-summary', kind: 'component' };

/*** Creates an available canonical envelope for one scoped Repetition observation. */
export function createRepetitionFact(
  ruleId: RepetitionRuleId,
  actual: JsonValue,
  expected: JsonValue = actual,
): AvailableFactEnvelope {
  return {
    contentHash: `sha256:${ruleId}:checkout-summary`,
    id: `${ruleId}:checkout-summary`,
    kind: 'design.repetition.observation',
    provenance: {
      collectedAt: '2026-11-05T00:00:00.000Z',
      producer: { id: 'test.component-inspector', version: '1.0.0' },
      source: { id: 'checkout-summary.tsx', revision: 'test-revision' },
    },
    schemaVersion: 1,
    scope: {
      ...repetitionScope,
      target: {
        kind: 'application',
        projectId: 'checkout',
        targetId: 'checkout-summary',
        tenantId: 'test-tenant',
      },
    },
    status: 'available',
    value: { actual, expected, ruleId, subject: { id: 'checkout-summary', kind: 'component' } },
  };
}

/*** Creates a canonical missing envelope without fabricating a repetition observation. */
export function createMissingRepetitionFact(ruleId: RepetitionRuleId): MissingFactEnvelope {
  return {
    contentHash: `sha256:${ruleId}:checkout-summary:missing`,
    id: `${ruleId}:checkout-summary`,
    kind: 'design.repetition.observation',
    missing: { code: 'not-collected', message: 'Inspector unavailable.' },
    provenance: {
      collectedAt: '2026-11-05T00:00:00.000Z',
      producer: { id: 'test.component-inspector', version: '1.0.0' },
      source: { id: 'checkout-summary.tsx', revision: 'test-revision' },
    },
    schemaVersion: 1,
    scope: {
      ...repetitionScope,
      target: {
        kind: 'application',
        projectId: 'checkout',
        targetId: 'checkout-summary',
        tenantId: 'test-tenant',
      },
    },
    status: 'missing',
  };
}
