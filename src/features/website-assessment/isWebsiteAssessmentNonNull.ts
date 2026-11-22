/*** Returns normalized assessment values only when every array element has been validated. */
export function validatedWebsiteAssessmentValues<Value>(
  values: readonly (Value | null)[],
): readonly Value[] | null {
  const validated = values.filter((value): value is Value => value !== null);
  return validated.length === values.length ? validated : null;
}
