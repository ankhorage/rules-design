import type { TypographyRulePolicy } from '../../types/typography.js';

/*** Rejects malformed policy before rule construction can produce ambiguous verdicts. */
export function validateTypographyRulePolicy(policy: TypographyRulePolicy): void {
  if (invalidTypographyRulePolicy(policy)) {
    throw new Error(
      'Typography rule policy must contain complete, internally consistent measurements.',
    );
  }
}

/*** Checks every policy invariant required by the Typography rule family. */
function invalidTypographyRulePolicy(policy: TypographyRulePolicy): boolean {
  return (
    !hasNonEmptyStrings(policy.allowedFontFamilies) ||
    !hasPositiveNumbers(policy.allowedFontSizes) ||
    !hasNonEmptyStrings(policy.allowedFontWeights) ||
    !hasFiniteNumbers(policy.allowedLetterSpacings) ||
    !hasPositiveNumbers(policy.allowedLineHeights) ||
    !hasNonNegativeNumbers(policy.allowedSpacingAfter) ||
    !hasNonNegativeNumbers(policy.allowedSpacingBefore) ||
    !hasConfiguredValues(policy.allowedSemanticStyles, hasNonEmptyStrings) ||
    !hasConfiguredValues(policy.responsiveFontSizes, hasPositiveNumbers) ||
    !hasValidH1Counts(policy) ||
    !hasValidTypographyThresholds(policy)
  );
}

/*** Checks that H1 count bounds are non-negative integers in ascending order. */
function hasValidH1Counts(policy: TypographyRulePolicy): boolean {
  return (
    Number.isInteger(policy.minimumH1Count) &&
    Number.isInteger(policy.maximumH1Count) &&
    policy.minimumH1Count >= 0 &&
    policy.maximumH1Count >= policy.minimumH1Count
  );
}

/*** Checks positive Typography thresholds and paragraph-measure bounds. */
function hasValidTypographyThresholds(policy: TypographyRulePolicy): boolean {
  return (
    isPositiveFiniteNumber(policy.minimumBodyFontSize) &&
    isPositiveFiniteNumber(policy.minimumParagraphMeasure) &&
    isPositiveFiniteNumber(policy.maximumParagraphMeasure) &&
    policy.maximumParagraphMeasure >= policy.minimumParagraphMeasure
  );
}

/*** Checks a non-empty serializable string allow-list. */
function hasNonEmptyStrings(values: unknown): values is readonly string[] {
  return (
    Array.isArray(values) &&
    values.length > 0 &&
    values.every((value) => typeof value === 'string' && value.length > 0)
  );
}

/*** Checks a non-empty serializable positive numeric allow-list. */
function hasPositiveNumbers(values: unknown): values is readonly number[] {
  return Array.isArray(values) && values.length > 0 && values.every(isPositiveFiniteNumber);
}

/*** Checks a non-empty serializable finite numeric allow-list. */
function hasFiniteNumbers(values: unknown): values is readonly number[] {
  return (
    Array.isArray(values) &&
    values.length > 0 &&
    values.every((value) => typeof value === 'number' && Number.isFinite(value))
  );
}

/*** Checks a non-empty serializable non-negative numeric allow-list. */
function hasNonNegativeNumbers(values: unknown): values is readonly number[] {
  return (
    Array.isArray(values) &&
    values.length > 0 &&
    values.every((value) => typeof value === 'number' && Number.isFinite(value) && value >= 0)
  );
}

/*** Checks a finite positive measurement. */
function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/*** Checks every named policy role supplies a non-empty valid allow-list. */
function hasConfiguredValues<T>(
  values: unknown,
  validate: (value: unknown) => value is readonly T[],
): values is Readonly<Record<string, readonly T[]>> {
  return (
    typeof values === 'object' &&
    values !== null &&
    !Array.isArray(values) &&
    Object.keys(values).length > 0 &&
    Object.entries(values).every(([key, value]) => key.length > 0 && validate(value))
  );
}
