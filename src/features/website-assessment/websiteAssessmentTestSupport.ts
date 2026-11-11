import { createHash } from 'node:crypto';

import type { AvailableFactEnvelope } from '@ankhorage/contracts/rules';
import { evaluateRules, type JsonValue } from '@ankhorage/rules';

import { createWebsiteAssessmentRuleSet } from './createWebsiteAssessmentRuleSet';

const scope = { id: 'site', kind: 'website' };
const options = {
  legalNoticePolicy: 'required',
  privacyNoticePolicy: 'required',
  referenceYear: 2026,
  trackingConsentPolicy: 'eu-eea-prior-consent',
} as const;

/*** Evaluates one website assessment rule through the public Rules engine boundary. */
export function evaluateWebsiteAssessment(
  ruleId: string,
  facts: readonly AvailableFactEnvelope[],
  override: Partial<typeof options> = {},
) {
  const rule = createWebsiteAssessmentRuleSet({ ...options, ...override }).rules.find(
    (candidate) => candidate.identity.id === ruleId,
  );
  if (rule === undefined) throw new Error(`Missing rule ${ruleId}`);
  const [result] = evaluateRules({ facts }, [rule], {
    capabilities: rule.requiredCapabilities,
    scope,
  }).results;
  return result;
}

/*** Builds an available opaque test fact with a real SHA-256 content hash. */
export function websiteAssessmentFact(kind: string, value: JsonValue): AvailableFactEnvelope {
  const hash = createHash('sha256').update(canonical(value)).digest('hex');
  return {
    contentHash: `sha256:${hash}`,
    id: `${kind}:${hash.slice(0, 12)}`,
    kind,
    provenance: {
      collectedAt: '2026-11-11T00:00:00.000Z',
      producer: { id: 'fixture', version: '1' },
      source: { id: 'fixture', revision: null },
    },
    schemaVersion: 1,
    scope: {
      ...scope,
      target: { kind: 'application', projectId: 'project', targetId: 'site', tenantId: 'tenant' },
    },
    status: 'available',
    value,
  };
}

/*** Produces a stable serialization for real test content hashes. */
function canonical(value: JsonValue): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object')
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(',')}}`;
  return JSON.stringify(value);
}
