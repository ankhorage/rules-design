import type { DesignRuleEvidence, DesignRuleScope } from '../../types/designRuleCatalog';

interface RuleSemantics {
  readonly evidence: DesignRuleEvidence;
  readonly requiredCapabilities: readonly string[];
  readonly scopes: readonly DesignRuleScope[];
}

interface EvidenceDefinition {
  readonly capabilities: readonly string[];
  readonly observations: readonly string[];
  readonly source: string;
  readonly terms: readonly string[];
}

const evidenceDefinitions: readonly EvidenceDefinition[] = [
  {
    capabilities: ['source.style-tokens'],
    observations: ['declared token name', 'token value', 'reference location'],
    source: 'declared-design-tokens',
    terms: ['token', 'ramp', 'literal-drift'],
  },
  {
    capabilities: ['rendered.area-analysis'],
    observations: ['viewport image', 'classified visible areas', 'area ratio'],
    source: 'rendered-area-analysis',
    terms: ['usage-distribution', 'visual-balance'],
  },
  {
    capabilities: ['viewport.layout', 'viewport.matrix'],
    observations: ['viewport dimensions', 'element bounds', 'scroll dimensions'],
    source: 'viewport-layout-snapshots',
    terms: ['responsive', 'zoom', 'orientation', 'reflow', 'text-wrap', 'horizontal-overflow'],
  },
  {
    capabilities: ['dom.accessibility-tree'],
    observations: ['semantic role', 'accessible name', 'document order'],
    source: 'accessibility-tree',
    terms: [
      'heading',
      'landmark',
      'semantics',
      'accessible-name',
      'form-label',
      'error-association',
      'focus-order',
      'keyboard',
      'status-feedback',
      'text-alternatives',
      'color-only',
    ],
  },
  {
    capabilities: ['media.metadata'],
    observations: ['intrinsic media metadata', 'rendered bounds', 'resolved object-fit'],
    source: 'media-and-render-metadata',
    terms: ['image', 'media', 'icon'],
  },
  {
    capabilities: ['ui.component-tree'],
    observations: ['component identity', 'variant properties', 'instance style values'],
    source: 'component-instance-tree',
    terms: ['repetition', 'template-drift', 'local-overrides'],
  },
  {
    capabilities: ['dom.layout'],
    observations: ['element bounds', 'computed spacing', 'alignment axis'],
    source: 'resolved-layout-geometry',
    terms: ['spacing', 'proximity', 'alignment', 'layout'],
  },
];

const scopeDefinitions: readonly (readonly [readonly string[], DesignRuleScope])[] = [
  [
    [
      'token-exists',
      'token-allowed',
      'ramp-consistency',
      'theme-coverage',
      'template-drift',
      'local-overrides',
    ],
    'project',
  ],
  [
    [
      'usage-distribution',
      'visual-hierarchy',
      'visual-balance',
      'breakpoint-coverage',
      'reflow',
      'zoom',
      'orientation',
      'heading.h1',
      'heading.level-order',
      'landmark',
      'focus-order',
      'reading-order',
      'status-feedback',
    ],
    'page',
  ],
  [['spacing', 'proximity', 'alignment', 'layout', 'repetition'], 'component'],
];

/*** Resolves each planned rule into the evidence contract a provider must satisfy. */
export function designRuleSemantics(id: string, assertion: string): RuleSemantics {
  const definition = evidenceDefinitions.find((candidate) => includesAny(id, candidate.terms));
  const evidence = definition ?? defaultEvidenceDefinition;
  const scope = scopeDefinitions.find(([terms]) => includesAny(id, terms))?.[1] ?? 'element';
  return {
    evidence: { assertion, observations: evidence.observations, source: evidence.source },
    requiredCapabilities: additionalCapabilities(id, evidence.capabilities),
    scopes: [scope],
  };
}

const defaultEvidenceDefinition: EvidenceDefinition = {
  capabilities: ['dom.computed-style'],
  observations: ['computed style property', 'resolved foreground', 'resolved background'],
  source: 'resolved-rendered-style',
  terms: [],
};

/*** Adds only the capabilities required by interaction, text, or motion semantics. */
function additionalCapabilities(id: string, capabilities: readonly string[]): readonly string[] {
  return [
    ...capabilities,
    ...(id.includes('ratio') ? ['dom.text-content'] : []),
    ...(includesAny(id, ['hover', 'active', 'disabled', 'focus-visible'])
      ? ['browser.interaction-state']
      : []),
    ...(id.includes('reduced-motion') ? ['browser.media-preference'] : []),
  ];
}

/*** Returns whether a rule identifier contains one of a definition's semantic terms. */
function includesAny(value: string, terms: readonly string[]): boolean {
  return terms.some((term) => value.includes(term));
}
