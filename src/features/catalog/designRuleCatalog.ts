import type { DesignAssessmentKind, DesignRuleCatalogEntry } from '../../types/designRuleCatalog';
import { designRuleComposites } from './designRuleComposites';
import { designRuleSemantics } from './designRuleSemantics';

type Definition = readonly [id: string, description: string, assessmentKind?: DesignAssessmentKind];

/*** Declares the Wave 0 catalog without registering executable rules. */
const atomicDesignRuleCatalog: readonly DesignRuleCatalogEntry[] = [
  group(
    'Color & Tokens',
    ['color'],
    ['color'],
    [
      ['design.color.syntax-valid', 'Colors are syntactically valid.'],
      ['design.color.token-exists', 'Referenced color tokens exist.'],
      ['design.color.token-allowed', 'Only permitted palette tokens are used.'],
      [
        'design.color.semantic-role',
        'Foreground, background, and border roles are semantically correct.',
      ],
      ['design.color.literal-drift', 'Unnecessary literal values do not drift from tokens.'],
      ['design.color.ramp-consistency', 'Defined color ramps remain consistent.'],
      ['design.color.alpha-composition', 'Transparency is evaluated against the actual backdrop.'],
      ['design.color.surface-role', 'Surface colors consistently express their role.'],
      ['design.color.hover-state', 'Hover color variation follows policy.'],
      ['design.color.active-state', 'Active color variation follows policy.'],
      ['design.color.disabled-state', 'Disabled colors communicate disabled state.'],
      ['design.color.theme-coverage', 'Light and dark theme tokens are available.'],
      [
        'design.color.usage-distribution',
        'Configured base, complementary, and accent shares are evidenced from visible areas.',
        'heuristic',
      ],
    ],
  ),
  group(
    'Contrast & Visual Hierarchy',
    ['text', 'page'],
    ['color', 'accessibility'],
    [
      ['design.contrast.text-ratio', 'Effective text contrast meets the selected standard.'],
      [
        'design.contrast.nontext-ratio',
        'Relevant non-text UI and graphics have sufficient contrast.',
      ],
      ['design.contrast.focus-visible', 'Focus indicators are visible.'],
      ['design.contrast.surface-separation', 'Relevant surfaces remain distinguishable.'],
      ['design.contrast.state-distinction', 'Interactive states are visibly distinct.'],
      ['design.contrast.link-distinction', 'Links are sufficiently distinguishable.'],
      ['design.contrast.text-background-resolved', 'The effective text background is resolved.'],
      [
        'design.contrast.cta-prominence',
        'Primary calls to action are visually prominent.',
        'heuristic',
      ],
      [
        'design.contrast.visual-hierarchy',
        'Visual emphasis forms an understandable hierarchy.',
        'heuristic',
      ],
    ],
  ),
  group(
    'Typography & Heading',
    ['text', 'heading'],
    ['typography', 'heading'],
    [
      ['design.typography.font-family', 'Font families are permitted.'],
      ['design.typography.scale', 'Typography follows a consistent scale.'],
      ['design.typography.weight', 'Typography weights are defined.'],
      ['design.typography.line-height', 'Line heights are consistent.'],
      ['design.typography.letter-spacing', 'Letter spacing is consistent.'],
      ['design.typography.paragraph-measure', 'Paragraph line length is useful.', 'heuristic'],
      ['design.typography.body-minimum', 'Body text meets the configured minimum.'],
      ['design.typography.responsive-scale', 'Typography scales consistently across breakpoints.'],
      ['design.heading.h1-presence', 'Each page has an expected H1.'],
      ['design.heading.h1-count', 'H1 count obeys its configured constraint.'],
      ['design.heading.level-order', 'Heading levels form a logical hierarchy.'],
      [
        'design.heading.semantic-style',
        'HTML heading level and visual role are correctly separated.',
      ],
      ['design.heading.spacing-before', 'Heading spacing before is contextually consistent.'],
      ['design.heading.spacing-after', 'Heading spacing after is contextually consistent.'],
      ['design.heading.text-clipping', 'Headings are not clipped.'],
    ],
  ),
  group(
    'Spacing & Proximity',
    ['card', 'form', 'heading'],
    ['spacing', 'alignment'],
    [
      ['design.spacing.token-allowed', 'Spacing uses permitted tokens.'],
      ['design.spacing.vertical-rhythm', 'Vertical rhythm is consistent.'],
      ['design.spacing.section-gap', 'Section gaps follow the system.'],
      ['design.spacing.container-padding', 'Containers have appropriate padding.'],
      ['design.proximity.related-grouping', 'Related elements are near each other.', 'heuristic'],
      [
        'design.proximity.unrelated-separation',
        'Unrelated groups are visually separated.',
        'heuristic',
      ],
      ['design.proximity.label-control', 'Labels and controls are spatially connected.'],
      ['design.proximity.heading-content', 'Headings group with their following content.'],
      ['design.proximity.card-internals', 'Card internals are consistently grouped.'],
      ['design.spacing.double-application', 'Cumulative duplicate spacing is detected.'],
      ['design.spacing.unexpected-collapse', 'Unexpected margin collapsing and gaps are detected.'],
    ],
  ),
  group(
    'Alignment & Layout',
    ['page', 'component'],
    ['alignment', 'responsive'],
    [
      ['design.alignment.shared-edges', 'Shared visual edges align.'],
      ['design.alignment.grid-tracks', 'Elements follow grid tracks.'],
      ['design.alignment.baselines', 'Typical baselines align.'],
      ['design.alignment.text', 'Text alignment is intentional and consistent.'],
      ['design.alignment.flex-items', 'Flex alignment follows its defined pattern.'],
      ['design.alignment.component-axes', 'Equivalent components share axes.'],
      ['design.layout.container-width', 'Container widths obey configured bounds.'],
      ['design.layout.grid-gap', 'Grid gaps follow the system.'],
      ['design.layout.horizontal-overflow', 'Unexpected horizontal overflow is absent.'],
      ['design.layout.vertical-clipping', 'Unexpected vertical clipping is absent.'],
      ['design.layout.unintended-overlap', 'Unexpected overlap is absent.'],
      [
        'design.layout.unnecessary-wrapper',
        'Avoidable structural wrappers are identified.',
        'heuristic',
      ],
      ['design.layout.visual-balance', 'Visual weight is balanced.', 'heuristic'],
    ],
  ),
  group(
    'Repetition & Components',
    ['button', 'card', 'form'],
    ['typography', 'alignment'],
    [
      ['design.repetition.button-variants', 'Button variants are consistent.'],
      ['design.repetition.card-variants', 'Card variants and templates are consistent.'],
      ['design.repetition.heading-variants', 'Heading roles are consistent.'],
      ['design.repetition.form-control-style', 'Form controls are consistently styled.'],
      ['design.repetition.link-treatment', 'Link treatment is consistent.'],
      ['design.repetition.navigation-treatment', 'Navigation treatment is consistent.'],
      ['design.repetition.icons', 'Icon size and style are consistent.'],
      ['design.repetition.border-radius', 'Border radii follow tokens and variants.'],
      ['design.repetition.border-weight', 'Border weights are consistent.'],
      ['design.repetition.elevation', 'Shadows and elevation are consistent.'],
      ['design.repetition.motion', 'Motion patterns are consistent.'],
      ['design.repetition.local-overrides', 'Unwanted local overrides are identified.'],
      ['design.repetition.template-drift', 'Instances do not drift from their template.'],
    ],
  ),
  group(
    'Responsive',
    ['page', 'text', 'image'],
    ['responsive'],
    [
      ['design.responsive.breakpoint-coverage', 'Required viewport ranges were examined.'],
      ['design.responsive.reflow', 'Layouts reflow meaningfully.'],
      ['design.responsive.horizontal-overflow', 'Critical widths do not overflow horizontally.'],
      ['design.responsive.text-wrap', 'Text wraps meaningfully.'],
      ['design.responsive.touch-target', 'Controls meet configured touch target size.'],
      ['design.responsive.order', 'Important reading order is preserved.'],
      ['design.responsive.image-crop', 'Important image content is not lost by crop.', 'heuristic'],
      ['design.responsive.fixed-dimensions', 'Problematic fixed dimensions are identified.'],
      ['design.responsive.zoom-reflow', 'Layouts reflow under zoom.'],
      ['design.responsive.orientation', 'Layouts are robust across orientation.'],
    ],
  ),
  group(
    'Accessibility & Semantics',
    ['button', 'form', 'image', 'page'],
    ['accessibility'],
    [
      ['design.a11y.accessible-name', 'Interactive controls have accessible names.'],
      ['design.a11y.form-label', 'Form fields have correct labels.'],
      ['design.a11y.error-association', 'Errors are semantically associated.'],
      ['design.a11y.keyboard-reachability', 'Interactive elements are keyboard reachable.'],
      ['design.a11y.focus-order', 'Focus order is meaningful.'],
      ['design.a11y.color-only', 'Information is not conveyed by color alone.'],
      ['design.a11y.reduced-motion', 'Reduced-motion settings are respected.'],
      ['design.a11y.landmarks', 'Landmarks are meaningful.'],
      ['design.a11y.main-landmark', 'Main content is identified.'],
      ['design.a11y.list-semantics', 'Lists have correct semantics.'],
      ['design.a11y.button-link-semantics', 'Buttons and links have correct semantics.'],
      ['design.a11y.status-feedback', 'Status changes are announced.'],
      [
        'design.a11y.text-alternatives',
        'Text alternatives are meaningful and decorative media is identified.',
      ],
    ],
  ),
  group(
    'Images & Media',
    ['image', 'media'],
    ['media'],
    [
      ['design.media.aspect-ratio', 'Aspect ratios are consistent.'],
      ['design.media.intrinsic-size', 'Intrinsic image dimensions are known.'],
      ['design.media.resolution-fit', 'Resolution suits rendered size.'],
      ['design.media.object-fit', 'Object fitting follows configuration.'],
      [
        'design.media.focal-point',
        'Important subjects are not unintentionally cropped.',
        'heuristic',
      ],
      ['design.media.responsive-sources', 'Appropriate responsive sources exist.'],
      ['design.media.overlay-legibility', 'Text on imagery remains legible.'],
      ['design.media.icon-sizing', 'Icons scale consistently.'],
      [
        'design.media.decorative-vs-content',
        'Decorative and content images are classified correctly.',
      ],
    ],
  ),
].flat();

/*** Exposes the complete planned atomic and composite design rule catalog. */
export const designRuleCatalog: readonly DesignRuleCatalogEntry[] = [
  ...atomicDesignRuleCatalog,
  ...designRuleComposites(atomicDesignRuleCatalog),
];

/*** Creates complete catalog records from one semantically cohesive rule group. */
function group(
  groupName: string,
  subjects: readonly string[],
  topics: readonly string[],
  rules: readonly Definition[],
): readonly DesignRuleCatalogEntry[] {
  return rules.map(([id, description, assessmentKind = 'objective']) => {
    const semantics = designRuleSemantics(id, description);
    return {
      assessmentKind,
      dependencies: [],
      description,
      evidenceSchemaVersion: '1',
      expectedEvidence: semantics.evidence,
      facets: {
        principles: principlesFor(id),
        scopes: semantics.scopes,
        subjects,
        topics,
      },
      group: groupName,
      id,
      name: id.slice('design.'.length),
      requiredCapabilities: semantics.requiredCapabilities,
      semanticsVersion: '1',
      severity: assessmentKind === 'objective' ? 'required' : 'advisory',
      status: 'planned',
    };
  });
}

/*** Maps catalog IDs to controlled C.R.A.P. facet principles. */
function principlesFor(id: string): readonly string[] {
  if (id.includes('contrast') || id.includes('color')) return ['contrast'];
  if (id.includes('repetition')) return ['repetition'];
  if (id.includes('alignment') || id.includes('layout')) return ['alignment'];
  if (id.includes('spacing') || id.includes('proximity')) return ['proximity'];
  return [];
}
