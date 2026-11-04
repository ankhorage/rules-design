import type {
  JsonValue,
  Rule,
  RuleEvaluationOutcome,
  RuleFinding,
  RuleOptionDiagnostic,
  RuleSet,
} from '@ankhorage/rules';
import { isRecord } from '@ankhorage/utility/object';

import type {
  DesignColorRole,
  DesignColorUsageDistributionFact,
  DesignColorUsageScope,
  DesignContext,
} from '../../types/designRuleProvider';
import { createColorPolicyRules } from './createColorPolicyRules';

interface ColorUsageDistributionOptions {
  readonly [key: string]: JsonValue;
  readonly requiredScopes: readonly DesignColorUsageScope[];
  readonly roleTargets: Readonly<Record<Exclude<DesignColorRole, 'unknown'>, number>>;
  readonly roleTolerances: Readonly<Record<Exclude<DesignColorRole, 'unknown'>, number>>;
  readonly version: 1;
}

interface UsageEvidence {
  readonly breakpointId: string;
  readonly observedShares: Readonly<Record<DesignColorRole, number>>;
  readonly scope: DesignColorUsageScope;
  readonly scopeId: string;
  readonly themeId: string;
  readonly unknownShare: number;
}

const defaultUsageDistributionOptions: ColorUsageDistributionOptions = {
  requiredScopes: ['page'],
  roleTargets: { accent: 0.1, base: 0.6, secondary: 0.3 },
  roleTolerances: { accent: 0, base: 0, secondary: 0 },
  version: 1,
};

/*** Creates the independent Color and Tokens rule contribution without central registration. */
export function createColorRuleSet(): RuleSet<DesignContext> {
  return {
    id: 'ankhorage.rules-design.color',
    rules: [...createColorPolicyRules(), colorUsageDistributionRule],
  };
}

/*** Evaluates rendered color areas against versioned role targets and tolerances. */
const colorUsageDistributionRule: Rule<DesignContext> = {
  defaultSeverity: 'warning',
  dependencies: [],
  evaluate: ({ context, options }) =>
    evaluateColorUsageDistribution(
      context.colorUsageDistributionFacts ?? [],
      isUsageDistributionOptions(options) ? options : undefined,
    ),
  identity: { id: 'design.color.usage-distribution', version: '1.0.0' },
  requiredCapabilities: ['rendered.area-analysis'],
  summary:
    'Compare separately measured rendered color-role areas with the configured distribution.',
  validateOptions: validateUsageDistributionOptions,
};

/*** Evaluates separate breakpoint, theme, and scope measurements without combining their areas. */
function evaluateColorUsageDistribution(
  facts: readonly DesignColorUsageDistributionFact[],
  options: ColorUsageDistributionOptions | undefined,
): RuleEvaluationOutcome {
  const configuration = options ?? defaultUsageDistributionOptions;
  const missingScopeKeys = requiredScopeKeys(facts, configuration.requiredScopes);
  if (facts.length === 0 || missingScopeKeys.length > 0) {
    return incompleteOutcome(
      'design.color.usage-distribution',
      missingScopeKeys.length > 0
        ? `Required rendered-area scope measurements are missing: ${missingScopeKeys.join(', ')}.`
        : 'No rendered-area distribution fact was supplied.',
    );
  }
  const invalidFacts = facts.filter((fact) => !isCompleteAreaFact(fact));
  if (invalidFacts.length > 0) {
    return incompleteOutcome(
      'design.color.usage-distribution',
      'Rendered-area evidence has unresolved pixels or an invalid measured area.',
    );
  }
  const evidence = facts.map(toUsageEvidence);
  const pageEvidence = evidence.filter((fact) => fact.scope === 'page');
  const deviations = pageEvidence.flatMap((fact) => roleDeviations(fact, configuration));
  const localDiagnostics = evidence
    .filter((fact) => fact.scope !== 'page')
    .flatMap((fact) => roleDeviations(fact, configuration))
    .map((deviation) => localDeviationFinding(deviation));
  return deviations.length === 0
    ? { findings: localDiagnostics, status: 'PASS' }
    : { findings: [...deviations.map(distributionFinding), ...localDiagnostics], status: 'FAIL' };
}

/*** Returns a stable key for each breakpoint, theme, and required scope combination. */
function requiredScopeKeys(
  facts: readonly DesignColorUsageDistributionFact[],
  requiredScopes: readonly DesignColorUsageScope[],
): readonly string[] {
  const configurations = new Set(facts.map((fact) => `${fact.breakpointId}:${fact.themeId}`));
  return [...configurations].flatMap((configuration) =>
    requiredScopes
      .filter(
        (scope) =>
          !facts.some(
            (fact) =>
              `${fact.breakpointId}:${fact.themeId}` === configuration && fact.scope === scope,
          ),
      )
      .map((scope) => `${configuration}:${scope}`),
  );
}

/*** Rejects unknown or non-positive painted-area totals instead of treating them as compliant. */
function isCompleteAreaFact(fact: DesignColorUsageDistributionFact): boolean {
  return fact.measuredPixels > 0 && fact.unknownPixels === 0;
}

/*** Converts exclusive painted pixel counts into a serializable scope-specific observation. */
function toUsageEvidence(fact: DesignColorUsageDistributionFact): UsageEvidence {
  return {
    breakpointId: fact.breakpointId,
    observedShares: {
      accent: fact.rolePixels.accent / fact.measuredPixels,
      base: fact.rolePixels.base / fact.measuredPixels,
      secondary: fact.rolePixels.secondary / fact.measuredPixels,
      unknown: fact.rolePixels.unknown / fact.measuredPixels,
    },
    scope: fact.scope,
    scopeId: fact.scopeId,
    themeId: fact.themeId,
    unknownShare: fact.unknownPixels / fact.measuredPixels,
  };
}

/*** Computes only target deviations whose configured tolerance is exceeded. */
function roleDeviations(
  evidence: UsageEvidence,
  options: ColorUsageDistributionOptions,
): readonly UsageEvidenceDeviation[] {
  return (['base', 'secondary', 'accent'] as const).flatMap((role) => {
    const { observed, target, tolerance } = roleValues(evidence, options, role);
    const deviation = Math.abs(observed - target);
    return deviation > tolerance
      ? [{ deviation, evidence, observed, role, target, tolerance }]
      : [];
  });
}

/*** Selects a role's measured share and configured target without dynamic object access. */
function roleValues(
  evidence: UsageEvidence,
  options: ColorUsageDistributionOptions,
  role: Exclude<DesignColorRole, 'unknown'>,
): { readonly observed: number; readonly target: number; readonly tolerance: number } {
  switch (role) {
    case 'accent':
      return {
        observed: evidence.observedShares.accent,
        target: options.roleTargets.accent,
        tolerance: options.roleTolerances.accent,
      };
    case 'base':
      return {
        observed: evidence.observedShares.base,
        target: options.roleTargets.base,
        tolerance: options.roleTolerances.base,
      };
    case 'secondary':
      return {
        observed: evidence.observedShares.secondary,
        target: options.roleTargets.secondary,
        tolerance: options.roleTolerances.secondary,
      };
  }
}

interface UsageEvidenceDeviation {
  readonly deviation: number;
  readonly evidence: UsageEvidence;
  readonly observed: number;
  readonly role: Exclude<DesignColorRole, 'unknown'>;
  readonly target: number;
  readonly tolerance: number;
}

/*** Creates an advisory finding for a full-page target deviation. */
function distributionFinding(deviation: UsageEvidenceDeviation): RuleFinding {
  return {
    evidence: distributionEvidence(deviation),
    message: `${deviation.role} occupies ${deviation.observed} of the full page, outside its configured tolerance.`,
    ruleId: 'design.color.usage-distribution',
    severity: 'warning',
    subjects: [{ id: deviation.evidence.scopeId, kind: 'rendered-color-scope' }],
  };
}

/*** Reports a local deviation without turning an independently passing page result into a failure. */
function localDeviationFinding(deviation: UsageEvidenceDeviation): RuleFinding {
  return {
    evidence: distributionEvidence(deviation),
    message: `${deviation.role} locally deviates from the page-level distribution target.`,
    ruleId: 'design.color.usage-distribution',
    severity: 'info',
    subjects: [{ id: deviation.evidence.scopeId, kind: 'rendered-color-scope' }],
  };
}

/*** Preserves measured scope provenance, shares, target, tolerance, and unresolved coverage. */
function distributionEvidence(deviation: UsageEvidenceDeviation): JsonValue {
  return {
    breakpointId: deviation.evidence.breakpointId,
    deviation: deviation.deviation,
    observed: deviation.observed,
    observedShares: deviation.evidence.observedShares,
    role: deviation.role,
    scope: deviation.evidence.scope,
    scopeId: deviation.evidence.scopeId,
    target: deviation.target,
    themeId: deviation.evidence.themeId,
    tolerance: deviation.tolerance,
    unknownShare: deviation.evidence.unknownShare,
  };
}

/*** Creates a deterministic incomplete finding for absent or insufficient evidence. */
function incompleteOutcome(ruleId: string, message: string): RuleEvaluationOutcome {
  return {
    findings: [
      {
        evidence: { reason: message },
        message,
        ruleId,
        severity: 'info',
        subjects: [{ id: 'design-context', kind: 'design-context' }],
      },
    ],
    status: 'INCOMPLETE',
  };
}

/*** Validates the complete serializable configuration instead of accepting malformed profile input. */
function validateUsageDistributionOptions(
  options: JsonValue | undefined,
): readonly RuleOptionDiagnostic[] {
  if (!isUsageDistributionOptions(options)) {
    return [
      {
        code: 'invalid-color-usage-distribution-options',
        message: 'Options must define versioned role targets, tolerances, and required scopes.',
      },
    ];
  }
  return [];
}

/*** Narrows JSON-only input to the complete 60-30-10 option contract. */
function isUsageDistributionOptions(
  options: JsonValue | undefined,
): options is ColorUsageDistributionOptions {
  if (!isRecord(options) || options.version !== 1) return false;
  return (
    isScopeList(options.requiredScopes) &&
    isRoleNumberMap(options.roleTargets) &&
    isRoleNumberMap(options.roleTolerances)
  );
}

/*** Checks the configured measurement scope vocabulary. */
function isScopeList(value: JsonValue | undefined): value is readonly DesignColorUsageScope[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((scope) => scope === 'page' || scope === 'scroll-sample' || scope === 'viewport')
  );
}

/*** Checks target or tolerance maps for non-negative numeric role values. */
function isRoleNumberMap(
  value: JsonValue | undefined,
): value is Readonly<Record<Exclude<DesignColorRole, 'unknown'>, number>> {
  return (
    isRecord(value) &&
    numericRoleValue(value, 'base') !== undefined &&
    numericRoleValue(value, 'secondary') !== undefined &&
    numericRoleValue(value, 'accent') !== undefined
  );
}

/*** Reads one configured role value without accepting non-numeric JSON values. */
function numericRoleValue(
  values: Readonly<Record<string, unknown>>,
  role: Exclude<DesignColorRole, 'unknown'>,
): number | undefined {
  switch (role) {
    case 'accent':
      return typeof values.accent === 'number' && values.accent >= 0 ? values.accent : undefined;
    case 'base':
      return typeof values.base === 'number' && values.base >= 0 ? values.base : undefined;
    case 'secondary':
      return typeof values.secondary === 'number' && values.secondary >= 0
        ? values.secondary
        : undefined;
  }
}
