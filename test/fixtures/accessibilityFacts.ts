import type { SerializableValue } from '@ankhorage/contracts';
import type { AvailableFactEnvelope } from '@ankhorage/contracts/rules';

interface AccessibilityFactInput {
  readonly observation: SerializableValue;
  readonly ruleId: string;
}

/*** Creates one frozen portable fact for the accessibility rule family tests. */
export function createAccessibilityFact(input: AccessibilityFactInput): AvailableFactEnvelope {
  return {
    contentHash: `fixture-${input.ruleId}`,
    id: `fixture-${input.ruleId}`,
    kind: input.ruleId,
    provenance: {
      collectedAt: '2026-11-05T00:00:00.000Z',
      producer: { id: 'fixture-accessibility-adapter', version: '1' },
      source: { id: 'fixture-document', revision: '1' },
    },
    schemaVersion: 1,
    scope: {
      id: 'fixture-page',
      kind: 'page',
      target: {
        kind: 'document',
        projectId: 'fixture-project',
        targetId: 'fixture-document',
        tenantId: 'fixture-tenant',
      },
    },
    status: 'available',
    value: { observations: [input.observation] },
  };
}
