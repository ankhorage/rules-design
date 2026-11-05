import type { FactEnvelope } from '@ankhorage/contracts/rules';
import type { JsonValue, Rule, RuleEvaluationOutcome, RuleScope, RuleSet } from '@ankhorage/rules';

import {
  evaluateMediaAssessment,
  type MediaAssessment,
  type MediaCheck,
} from './evaluateMediaAssessment';
import { type MediaRuleDefinition, mediaRuleDefinitions } from './mediaRuleDefinitions';

/*** Creates the independently composable Images and Media rule contribution from portable facts. */
export function createMediaRuleSet(options: MediaRuleOptions = {}): RuleSet<MediaRuleContext> {
  const aspectRatioTolerance = resolveAspectRatioTolerance(options);
  return {
    id: 'ankhorage.rules-design.media',
    rules: mediaRuleDefinitions.map((definition) =>
      createMediaRule(definition, aspectRatioTolerance),
    ),
  };
}

/*** Configures the group-local tolerance used when comparing measured aspect ratios. */
export interface MediaRuleOptions {
  readonly aspectRatioTolerance?: number;
}

interface MediaRuleContext {
  readonly facts: readonly FactEnvelope[];
}

/*** Builds one pure generic Rule from a fixed catalog media identifier. */
function createMediaRule(
  definition: MediaRuleDefinition,
  aspectRatioTolerance: number,
): Rule<MediaRuleContext> {
  return {
    defaultSeverity: definition.id === 'design.media.focal-point' ? 'warning' : 'error',
    dependencies: [],
    evaluate: ({ context, scope }) =>
      evaluateMediaRule(definition, aspectRatioTolerance, context, scope),
    identity: { id: definition.id, version: '1.0.0' },
    requiredCapabilities: ['media.metadata'],
    summary: definition.summary,
  };
}

/*** Evaluates all complete, scope-matching assessments without fabricating unavailable measurements. */
function evaluateMediaRule(
  definition: MediaRuleDefinition,
  aspectRatioTolerance: number,
  context: MediaRuleContext,
  scope: RuleScope,
): RuleEvaluationOutcome {
  const scopedFacts = context.facts.filter((fact) => matchesMediaScope(fact, scope));
  if (scopedFacts.length === 0) {
    return incomplete(definition.id, 'No media assessment fact exists for this scope.');
  }
  if (scopedFacts.some((fact) => fact.status === 'missing')) {
    return incomplete(definition.id, 'A media assessment fact is explicitly unavailable.');
  }
  const assessments = scopedFacts.flatMap(toMediaAssessment);
  if (assessments.length !== scopedFacts.length) {
    return incomplete(definition.id, 'A media assessment fact has an invalid serializable value.');
  }
  const checks = assessments.map((assessment) =>
    evaluateMediaAssessment(definition, aspectRatioTolerance, assessment),
  );
  if (checks.some((check) => check === null)) {
    return incomplete(
      definition.id,
      'A media assessment lacks the measurements required by this rule.',
    );
  }
  return failedOutcome(
    definition,
    checks.filter((check): check is MediaCheck => check !== null),
  );
}

/*** Resolves the trusted aspect-ratio tolerance at the factory boundary. */
function resolveAspectRatioTolerance(options: MediaRuleOptions): number {
  const tolerance = options.aspectRatioTolerance ?? 0;
  if (!Number.isFinite(tolerance) || tolerance < 0) {
    throw new TypeError('Aspect-ratio tolerance must be a finite non-negative number.');
  }
  return tolerance;
}

/*** Matches only media facts observed for the exact evaluation scope. */
function matchesMediaScope(fact: FactEnvelope, scope: RuleScope): boolean {
  return (
    fact.kind === 'design.media.assessment' &&
    fact.scope.id === scope.id &&
    fact.scope.kind === scope.kind
  );
}

/*** Parses one available frozen fact into its minimal rule-owned media shape. */
function toMediaAssessment(fact: FactEnvelope): readonly MediaAssessment[] {
  if (fact.status !== 'available' || !isSerializableRecord(fact.value)) return [];
  const { mediaId } = fact.value;
  return typeof mediaId === 'string' && mediaId.length > 0
    ? [{ id: mediaId, value: fact.value }]
    : [];
}

/*** Converts failed media checks to rule findings from every scoped assessment. */
function failedOutcome(
  definition: MediaRuleDefinition,
  checks: readonly MediaCheck[],
): RuleEvaluationOutcome {
  const failures = checks.filter((check) => check.status === 'FAIL');
  return failures.length === 0
    ? { findings: [], status: 'PASS' }
    : {
        findings: failures.map((failure) => ({
          evidence: failure.evidence,
          message: failure.message,
          ruleId: definition.id,
          severity: definition.id === 'design.media.focal-point' ? 'warning' : 'error',
          subjects: [{ id: failure.mediaId, kind: 'media' }],
        })),
        status: 'FAIL',
      };
}

/*** Creates a deterministic incomplete outcome for absent or invalid factual evidence. */
function incomplete(ruleId: string, message: string): RuleEvaluationOutcome {
  return {
    findings: [
      {
        evidence: { reason: message },
        message,
        ruleId,
        severity: 'info',
        subjects: [{ id: 'media-facts', kind: 'media-facts' }],
      },
    ],
    status: 'INCOMPLETE',
  };
}

/*** Identifies a serializable keyed record without accepting serializable arrays. */
function isSerializableRecord(value: JsonValue): value is Readonly<Record<string, JsonValue>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
