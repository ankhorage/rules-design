import type { JsonValue, RuleSubject } from '@ankhorage/rules';
import { isRecord } from '@ankhorage/utility/object';

import type {
  AssessmentFact,
  AssessmentFinding,
  AssessmentResult,
} from '../../types/websiteAssessment';
import { validatedWebsiteAssessmentValues } from './isWebsiteAssessmentNonNull';
import { websiteAssessmentResult } from './websiteAssessmentResult';
import { websiteAssessmentValues } from './websiteAssessmentValues';

/*** Reports repeated editorial identities while exempting system-only reuse. */
export function assessDuplicateMediaUse(facts: readonly AssessmentFact[]): AssessmentResult {
  const inventories = validatedWebsiteAssessmentValues(facts.map((fact) => mediaUses(fact.value)));
  if (inventories === null) return websiteAssessmentResult(null);
  const observations = inventories.flatMap((inventory) => inventory);
  if (observations.length === 0) return websiteAssessmentResult(null);
  const groups = observations.reduce(
    (all, use) => new Map(all).set(use.identity, [...(all.get(use.identity) ?? []), use]),
    new Map<string, readonly MediaUse[]>(),
  );
  return websiteAssessmentResult(
    [...groups.values()].flatMap((group) =>
      group.length > 1 && group.some((use) => use.role === 'editorial')
        ? [duplicateFinding(group)]
        : [],
    ),
  );
}

interface MediaUse {
  readonly identity: string;
  readonly location: string;
  readonly role: 'editorial' | 'system';
  readonly subject: RuleSubject;
}

/*** Parses one inventory while preserving the distinction between invalid and empty input. */
function mediaUses(value: Readonly<Record<string, JsonValue>>): readonly MediaUse[] | null {
  if (value.version !== 1 || !Array.isArray(value.uses)) return null;
  const uses = value.uses.map(mediaUse);
  return validatedWebsiteAssessmentValues(uses);
}

/*** Parses a single opaque media use from an identity-bearing inventory entry. */
function mediaUse(value: JsonValue): MediaUse | null {
  if (!isRecord(value)) return null;
  const subject = websiteAssessmentValues.subject(value.subject);
  const identity =
    websiteAssessmentValues.text(value.contentHash) ??
    websiteAssessmentValues.text(value.lineageId) ??
    websiteAssessmentValues.text(value.assetId);
  const pageId = websiteAssessmentValues.text(value.pageId);
  const componentId = websiteAssessmentValues.text(value.componentId);
  return subject !== null &&
    identity !== null &&
    pageId !== null &&
    componentId !== null &&
    (value.role === 'editorial' || value.role === 'system')
    ? { identity, location: `${pageId}:${componentId}`, role: value.role, subject }
    : null;
}

/*** Produces sorted opaque evidence for one repeated asset identity. */
function duplicateFinding(group: readonly MediaUse[]): AssessmentFinding {
  const [first] = group;
  return {
    evidence: {
      assetKey: first.identity,
      locations: group.map((use) => use.location).sort(),
      useCount: group.length,
    },
    message: 'A verified asset is reused in multiple editorial content locations.',
    subject: first.subject,
  };
}
