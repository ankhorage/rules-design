import type {
  DesignRuleCatalogEntry,
  DesignRuleCatalogFilter,
} from '../../types/designRuleCatalog.js';

/*** Selects planned catalog entries matching every supplied controlled facet. */
export function filterDesignRuleCatalog(
  entries: readonly DesignRuleCatalogEntry[],
  filter: DesignRuleCatalogFilter,
): readonly DesignRuleCatalogEntry[] {
  return entries.filter(
    (entry) =>
      matches(entry.facets.topics, filter.topics) &&
      matches(entry.facets.subjects, filter.subjects) &&
      matches(entry.facets.scopes, filter.scopes) &&
      matches(entry.facets.principles, filter.principles),
  );
}

/*** Returns whether an entry facet contains every requested value. */
function matches(values: readonly string[], requested: readonly string[] | undefined): boolean {
  return requested === undefined || requested.every((value) => values.includes(value));
}
