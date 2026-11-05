import type { AvailableFactEnvelope } from '@ankhorage/contracts/rules';

interface AlignmentMetricFact extends AvailableFactEnvelope {
  readonly value: {
    readonly measurement: string;
    readonly observed: number;
    readonly subjectIds: readonly string[];
  };
}

/*** Creates a portable observed-geometry fact for one Alignment and Layout rule fixture. */
export function alignmentMetricFact(
  ruleId: string,
  scopeId: string,
  measurement: string,
  observed: number,
): AlignmentMetricFact {
  return {
    contentHash: `fixture-${ruleId}-${scopeId}-${observed}`,
    id: `${ruleId}:${scopeId}`,
    kind: ruleId,
    provenance: {
      collectedAt: '2026-11-05T00:00:00.000Z',
      producer: { id: 'fixture', version: '1' },
      source: { id: 'fixture', revision: null },
    },
    schemaVersion: 1,
    scope: {
      id: scopeId,
      kind: 'page',
      target: {
        kind: 'project',
        projectId: 'fixture-project',
        targetId: 'fixture-target',
        tenantId: 'fixture-tenant',
      },
    },
    status: 'available',
    value: { measurement, observed, subjectIds: ['fixture-subject'] },
  };
}
