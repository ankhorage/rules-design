import type { JsonValue } from '@ankhorage/rules';

import type { ColorPolicyRuleId, ColorRulePolicy } from '../../types/color';
import { colorObservationValues } from './colorObservationValues';

type Verdict = 'FAIL' | 'INCOMPLETE' | 'PASS';

/*** Evaluates one normalized raw observation using its frozen Color rule policy. */
export function evaluateColorPolicyObservation(
  ruleId: ColorPolicyRuleId,
  value: Readonly<Record<string, JsonValue>>,
  policy: ColorRulePolicy,
): Verdict {
  switch (ruleId) {
    case 'design.color.syntax-valid':
      return syntaxValid(value, policy);
    case 'design.color.token-exists':
      return tokenExists(value, policy);
    case 'design.color.token-allowed':
      return tokenAllowed(value, policy);
    case 'design.color.semantic-role':
      return semanticRole(value, policy);
    case 'design.color.literal-drift':
      return literalDrift(value, policy);
    case 'design.color.ramp-consistency':
      return rampConsistency(value, policy);
    case 'design.color.alpha-composition':
      return alphaComposition(value, policy);
    case 'design.color.surface-role':
      return surfaceRole(value, policy);
    case 'design.color.hover-state':
      return state(value, policy, 'hover');
    case 'design.color.active-state':
      return state(value, policy, 'active');
    case 'design.color.disabled-state':
      return state(value, policy, 'disabled');
    case 'design.color.theme-coverage':
      return themeCoverage(value, policy);
  }
}

/*** Confirms syntax policy and the corresponding literal form. */
function syntaxValid(value: Readonly<Record<string, JsonValue>>, policy: ColorRulePolicy): Verdict {
  const { color, syntax } = value;
  if (!colorObservationValues.text(color) || !colorObservationValues.text(syntax))
    return 'INCOMPLETE';
  return policy.allowedColorSyntaxes.includes(syntax) && validColorSyntax(color, syntax)
    ? 'PASS'
    : 'FAIL';
}

/*** Validates the supported syntax representation without deriving a policy verdict. */
function validColorSyntax(color: string, syntax: string): boolean {
  if (syntax === 'hex') return /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/iu.test(color);
  if (syntax === 'token') return /^[-\w./]+$/u.test(color);
  return false;
}

/*** Requires a referenced token to be present in the trusted inventory. */
function tokenExists(value: Readonly<Record<string, JsonValue>>, policy: ColorRulePolicy): Verdict {
  return colorObservationValues.text(value.token)
    ? policy.knownTokens.includes(value.token)
      ? 'PASS'
      : 'FAIL'
    : 'INCOMPLETE';
}

/*** Requires a referenced token to be permitted for use. */
function tokenAllowed(
  value: Readonly<Record<string, JsonValue>>,
  policy: ColorRulePolicy,
): Verdict {
  return colorObservationValues.text(value.token)
    ? policy.allowedTokens.includes(value.token)
      ? 'PASS'
      : 'FAIL'
    : 'INCOMPLETE';
}

/*** Checks that a semantic role uses one of its trusted tokens. */
function semanticRole(
  value: Readonly<Record<string, JsonValue>>,
  policy: ColorRulePolicy,
): Verdict {
  const { role, token } = value;
  if (!colorObservationValues.text(role) || !colorObservationValues.text(token))
    return 'INCOMPLETE';
  return configuredTokens(policy.semanticRoleTokens, role)?.includes(token) ? 'PASS' : 'FAIL';
}

/*** Rejects a canonical literal when it identifies a different token. */
function literalDrift(
  value: Readonly<Record<string, JsonValue>>,
  policy: ColorRulePolicy,
): Verdict {
  const { literal, token } = value;
  if (!colorObservationValues.text(literal) || !colorObservationValues.text(token))
    return 'INCOMPLETE';
  const canonicalToken = configuredValue(policy.canonicalLiterals, literal);
  return canonicalToken === undefined || canonicalToken === token ? 'PASS' : 'FAIL';
}

/*** Verifies the complete ordered token sequence for a named color ramp. */
function rampConsistency(
  value: Readonly<Record<string, JsonValue>>,
  policy: ColorRulePolicy,
): Verdict {
  const { ramp } = value;
  const tokens = colorObservationValues.strings(value.tokens);
  if (!colorObservationValues.text(ramp) || tokens === undefined) return 'INCOMPLETE';
  const expectedTokens = configuredTokens(policy.rampTokens, ramp);
  return expectedTokens !== undefined && colorObservationValues.sequence(tokens, expectedTokens)
    ? 'PASS'
    : 'FAIL';
}

/*** Verifies a foreground and backdrop against their trusted composited result. */
function alphaComposition(
  value: Readonly<Record<string, JsonValue>>,
  policy: ColorRulePolicy,
): Verdict {
  const { backdrop, composite, foreground } = value;
  if (
    !colorObservationValues.text(foreground) ||
    !colorObservationValues.text(backdrop) ||
    !colorObservationValues.text(composite)
  )
    return 'INCOMPLETE';
  const composites = configuredTokens(policy.alphaCompositions, foreground);
  return configuredValue(composites, backdrop) === composite ? 'PASS' : 'FAIL';
}

/*** Checks the configured token inventory for a rendered surface role. */
function surfaceRole(value: Readonly<Record<string, JsonValue>>, policy: ColorRulePolicy): Verdict {
  const { surface, token } = value;
  if (!colorObservationValues.text(surface) || !colorObservationValues.text(token))
    return 'INCOMPLETE';
  return configuredTokens(policy.surfaceRoleTokens, surface)?.includes(token) ? 'PASS' : 'FAIL';
}

/*** Checks the configured transition token for one interactive state. */
function state(
  value: Readonly<Record<string, JsonValue>>,
  policy: ColorRulePolicy,
  stateName: 'active' | 'disabled' | 'hover',
): Verdict {
  const { baseToken, stateToken } = value;
  if (!colorObservationValues.text(baseToken) || !colorObservationValues.text(stateToken))
    return 'INCOMPLETE';
  return configuredValue(statePolicy(policy, stateName), baseToken) === stateToken
    ? 'PASS'
    : 'FAIL';
}

/*** Selects a fixed interactive state map without dynamic policy object access. */
function statePolicy(
  policy: ColorRulePolicy,
  stateName: 'active' | 'disabled' | 'hover',
): Readonly<Record<string, string>> {
  switch (stateName) {
    case 'active':
      return policy.stateTokens.active;
    case 'disabled':
      return policy.stateTokens.disabled;
    case 'hover':
      return policy.stateTokens.hover;
  }
}

/*** Requires a token to supply every required theme in its policy inventory. */
function themeCoverage(
  value: Readonly<Record<string, JsonValue>>,
  policy: ColorRulePolicy,
): Verdict {
  const { token } = value;
  const themes = colorObservationValues.strings(value.themes);
  if (!colorObservationValues.text(token) || themes === undefined) return 'INCOMPLETE';
  const configuredThemes = configuredTokens(policy.themeTokens, token);
  return configuredThemes !== undefined &&
    policy.requiredThemeIds.every(
      (theme) => themes.includes(theme) && configuredThemes.includes(theme),
    )
    ? 'PASS'
    : 'FAIL';
}

/*** Retrieves a configured string value without dynamic object indexing. */
function configuredValue(
  values: Readonly<Record<string, string>> | undefined,
  key: string,
): string | undefined {
  return values === undefined
    ? undefined
    : Object.entries(values).find(([entry]) => entry === key)?.[1];
}

/*** Retrieves a configured string list without dynamic object indexing. */
function configuredTokens<T>(values: Readonly<Record<string, T>>, key: string): T | undefined {
  return Object.entries(values).find(([entry]) => entry === key)?.[1];
}
