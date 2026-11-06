import { isRecord } from '@ankhorage/utility/object';

import type { ColorRulePolicy } from '../../types/color';

/*** Verifies trusted Color factory policy before assessment closures are created. */
export function isColorRulePolicy(value: unknown): value is ColorRulePolicy {
  return (
    isRecord(value) &&
    value.version === 1 &&
    corePolicy(value) &&
    identifiers(value.allowedColorSyntaxes) &&
    identifiers(value.knownTokens) &&
    identifiers(value.allowedTokens) &&
    identifiers(value.requiredBreakpointIds) &&
    identifiers(value.requiredThemeIds) &&
    coverageScopes(value.requiredScopes) &&
    roleMap(value.roleTargets, true) &&
    roleMap(value.roleTolerances, false)
  );
}

/*** Validates the semantic policy maps independently from the coverage policy. */
function corePolicy(value: Readonly<Record<string, unknown>>): boolean {
  return (
    stringMap(value.canonicalLiterals) &&
    tokenLists(value.rampTokens) &&
    nestedTokenMap(value.alphaCompositions) &&
    tokenLists(value.semanticRoleTokens) &&
    tokenLists(value.surfaceRoleTokens) &&
    stateTokenMaps(value.stateTokens) &&
    tokenLists(value.themeTokens)
  );
}

/*** Requires non-empty unique policy identifiers. */
function identifiers(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    new Set(value).size === value.length &&
    value.every(text)
  );
}

/*** Narrows a complete map of raw literal values to canonical token names. */
function stringMap(value: unknown): value is Readonly<Record<string, string>> {
  return isRecord(value) && Object.keys(value).every(text) && Object.values(value).every(text);
}

/*** Narrows a semantic role map whose entries are non-empty trusted token inventories. */
function tokenLists(value: unknown): value is Readonly<Record<string, readonly string[]>> {
  return (
    isRecord(value) && Object.keys(value).every(text) && Object.values(value).every(identifiers)
  );
}

/*** Narrows a foreground and backdrop matrix to its trusted composited token. */
function nestedTokenMap(
  value: unknown,
): value is Readonly<Record<string, Readonly<Record<string, string>>>> {
  return isRecord(value) && Object.keys(value).every(text) && Object.values(value).every(stringMap);
}

/*** Narrows the three explicit interactive state policies. */
function stateTokenMaps(value: unknown): boolean {
  return (
    isRecord(value) &&
    stringMap(value.active) &&
    stringMap(value.disabled) &&
    stringMap(value.hover)
  );
}

/*** Requires page evidence while allowing any enabled local diagnostic scopes. */
function coverageScopes(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.includes('page') &&
    new Set(value).size === value.length &&
    value.every((scope) => scope === 'page' || scope === 'scroll-sample' || scope === 'viewport')
  );
}

/*** Checks normalized target or tolerance role maps. */
function roleMap(value: unknown, target: boolean): boolean {
  if (!isRecord(value)) return false;
  const { accent, base, secondary } = value;
  return (
    proportion(accent) &&
    proportion(base) &&
    proportion(secondary) &&
    (!target ||
      (typeof base === 'number' &&
        typeof secondary === 'number' &&
        typeof accent === 'number' &&
        Math.abs(base + secondary + accent - 1) < Number.EPSILON))
  );
}

/*** Narrows a finite role proportion within the supported inclusive range. */
function proportion(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

/*** Narrows a non-empty identifier. */
function text(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}
