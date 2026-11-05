import type { FactEnvelope } from '@ankhorage/contracts/rules';
import type {
  JsonValue,
  Rule,
  RuleEvaluationOutcome,
  RuleOptionDiagnostic,
  RuleScope,
  RuleSet,
} from '@ankhorage/rules';
import { isRecord } from '@ankhorage/utility/object';

import type { DesignColorUsageScope, DesignContext } from '../../types/designRuleProvider';
import { createColorPolicyRules } from './createColorPolicyRules';
type Role = 'accent' | 'base' | 'secondary';
interface Options {
  readonly [key: string]: JsonValue;
  readonly breakpointId: string;
  readonly requiredScopes: readonly DesignColorUsageScope[];
  readonly roleTolerances: Readonly<Record<Role, number>>;
  readonly themeId: string;
  readonly version: 1;
}
interface Measurement {
  readonly breakpointId: string;
  readonly measuredPixels: number;
  readonly rolePixels: Readonly<Record<Role, number>>;
  readonly scope: DesignColorUsageScope;
  readonly scopeId: string;
  readonly themeId: string;
  readonly unknownPixels: number;
}
const roles: readonly Role[] = ['base', 'secondary', 'accent'];
const targets: Readonly<Record<Role, number>> = { base: 0.6, secondary: 0.3, accent: 0.1 };
const defaults: Options = {
  breakpointId: 'desktop',
  requiredScopes: ['page'],
  roleTolerances: { base: 0, secondary: 0, accent: 0 },
  themeId: 'light',
  version: 1,
};
const factKind = 'design.color.usage-distribution';
/*** Creates the independent Color and Tokens rule contribution without central registration. */
export function createColorRuleSet(): RuleSet<DesignContext> {
  return { id: 'ankhorage.rules-design.color', rules: [...createColorPolicyRules(), usageRule] };
}
/*** Assesses the frozen 60-30-10 policy from complete scope-bound pixel observations. */
const usageRule: Rule<DesignContext> = {
  defaultSeverity: 'warning',
  dependencies: [],
  evaluate: ({ context, options, scope }) =>
    assess(context.facts ?? [], isOptions(options) ? options : defaults, scope),
  identity: { id: 'design.color.usage-distribution', version: '1.0.0' },
  requiredCapabilities: ['rendered.area-analysis'],
  summary: 'Assess full-page rendered color areas against the 60-30-10 distribution.',
  validateOptions,
};
/*** Requires exact scope, breakpoint, and theme before evaluating full-page evidence. */
function assess(
  facts: readonly FactEnvelope[],
  options: Options,
  scope: RuleScope,
): RuleEvaluationOutcome {
  const factsForScope = facts.filter((fact) => fact.kind === factKind && sameScope(fact, scope));
  if (factsForScope.some((fact) => fact.status !== 'available')) return incomplete();
  const measurements = factsForScope.map((fact) =>
    fact.status === 'available' ? parse(fact.value) : undefined,
  );
  if (measurements.some((item) => item === undefined)) return incomplete();
  const values = measurements as readonly Measurement[];
  if (
    values.some(
      (item) =>
        item.breakpointId !== options.breakpointId ||
        item.themeId !== options.themeId ||
        !complete(item),
    )
  )
    return incomplete();
  if (
    options.requiredScopes.some((name) => values.filter((item) => item.scope === name).length !== 1)
  )
    return incomplete();
  const page = values.filter((item) => item.scope === 'page');
  if (page.length !== 1 || page[0]?.scopeId !== scope.id) return incomplete();
  const pageFindings = findings(page[0], options, 'warning', scope);
  const local = values
    .filter((item) => item.scope !== 'page')
    .flatMap((item) => findings(item, options, 'info', scope));
  return pageFindings.length === 0
    ? { findings: local, status: 'PASS' }
    : { findings: [...pageFindings, ...local], status: 'FAIL' };
}
/*** Derives deviations from raw pixels and preserves local diagnostics as advisory findings. */
function findings(
  item: Measurement,
  options: Options,
  severity: 'info' | 'warning',
  scope: RuleScope,
) {
  return roles.flatMap((role) =>
    Math.abs(roleValue(item.rolePixels, role) / item.measuredPixels - roleValue(targets, role)) >
    roleValue(options.roleTolerances, role)
      ? [
          {
            evidence: {
              breakpointId: item.breakpointId,
              observed: roleValue(item.rolePixels, role) / item.measuredPixels,
              role,
              scope: item.scope,
              themeId: item.themeId,
              tolerance: roleValue(options.roleTolerances, role),
            },
            message: `${role} is outside its 60-30-10 tolerance.`,
            ruleId: 'design.color.usage-distribution',
            severity,
            subjects: [{ id: item.scopeId, kind: scope.kind }],
          },
        ]
      : [],
  );
}
/*** Validates complete pixel accounting, including uncovered pixels. */
function complete(item: Measurement): boolean {
  return (
    Number.isInteger(item.measuredPixels) &&
    item.measuredPixels > 0 &&
    item.unknownPixels === 0 &&
    roles.every(
      (role) =>
        Number.isInteger(roleValue(item.rolePixels, role)) && roleValue(item.rolePixels, role) >= 0,
    ) &&
    roles.reduce((total, role) => total + roleValue(item.rolePixels, role), item.unknownPixels) ===
      item.measuredPixels
  );
}
/*** Parses one versioned normalized color measurement. */
function parse(value: unknown): Measurement | undefined {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    !isScope(value.scope) ||
    typeof value.scopeId !== 'string' ||
    typeof value.breakpointId !== 'string' ||
    typeof value.themeId !== 'string' ||
    typeof value.measuredPixels !== 'number' ||
    typeof value.unknownPixels !== 'number' ||
    !isRecord(value.rolePixels)
  )
    return undefined;
  const { rolePixels } = value;
  const pixels = roles.every((role) => typeof roleValue(rolePixels, role) === 'number')
    ? (rolePixels as Readonly<Record<Role, number>>)
    : undefined;
  return pixels === undefined
    ? undefined
    : {
        breakpointId: value.breakpointId,
        measuredPixels: value.measuredPixels,
        rolePixels: pixels,
        scope: value.scope,
        scopeId: value.scopeId,
        themeId: value.themeId,
        unknownPixels: value.unknownPixels,
      };
}
/*** Matches a fact only when its complete semantic scope equals this evaluation. */
function sameScope(fact: FactEnvelope, scope: RuleScope): boolean {
  return fact.scope.id === scope.id && fact.scope.kind === scope.kind;
}
/*** Validates exact breakpoint, theme, scope and bounded tolerance options. */
function isOptions(value: JsonValue | undefined): value is Options {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    typeof value.breakpointId !== 'string' ||
    typeof value.themeId !== 'string' ||
    !Array.isArray(value.requiredScopes) ||
    value.requiredScopes.length === 0 ||
    !value.requiredScopes.every(isScope) ||
    !isRecord(value.roleTolerances)
  )
    return false;
  const tolerances = value.roleTolerances;
  return roles.every(
    (role) =>
      typeof roleValue(tolerances, role) === 'number' &&
      roleValue(tolerances, role) >= 0 &&
      roleValue(tolerances, role) <= 1,
  );
}
/*** Reports malformed options before the rule can evaluate them. */
function validateOptions(value: JsonValue | undefined): readonly RuleOptionDiagnostic[] {
  return isOptions(value)
    ? []
    : [
        {
          code: 'invalid-color-usage-distribution-options',
          message: 'Options require exact breakpoint, theme, scopes, and bounded role tolerances.',
        },
      ];
}
/*** Narrows the frozen observation-scope vocabulary. */
function isScope(value: unknown): value is DesignColorUsageScope {
  return value === 'page' || value === 'scroll-sample' || value === 'viewport';
}
/*** Reads one fixed color role without dynamic property access. */
function roleValue(values: Readonly<Record<string, unknown>>, role: Role): number {
  switch (role) {
    case 'accent':
      return values.accent as number;
    case 'base':
      return values.base as number;
    case 'secondary':
      return values.secondary as number;
  }
}
/*** Fails closed where exact evidence cannot support a distribution verdict. */
function incomplete(): RuleEvaluationOutcome {
  return { findings: [], status: 'INCOMPLETE' };
}
