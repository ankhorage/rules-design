/*** Identifies one frozen atomic Color policy rule. */
export type ColorPolicyRuleId =
  | 'design.color.syntax-valid'
  | 'design.color.token-exists'
  | 'design.color.token-allowed'
  | 'design.color.semantic-role'
  | 'design.color.literal-drift'
  | 'design.color.ramp-consistency'
  | 'design.color.alpha-composition'
  | 'design.color.surface-role'
  | 'design.color.hover-state'
  | 'design.color.active-state'
  | 'design.color.disabled-state'
  | 'design.color.theme-coverage';

type ColorState = 'active' | 'disabled' | 'hover';
type ColorRole = 'accent' | 'base' | 'secondary';
type RoleValues = Readonly<Record<ColorRole, number>>;

/*** Configures trusted semantic acceptance and coverage policy for frozen Color rules. */
export interface ColorRulePolicy {
  readonly alphaCompositions: Readonly<Record<string, Readonly<Record<string, string>>>>;
  readonly allowedColorSyntaxes: readonly string[];
  readonly allowedTokens: readonly string[];
  readonly canonicalLiterals: Readonly<Record<string, string>>;
  readonly knownTokens: readonly string[];
  readonly rampTokens: Readonly<Record<string, readonly string[]>>;
  readonly requiredBreakpointIds: readonly string[];
  readonly requiredScopes: readonly ('page' | 'scroll-sample' | 'viewport')[];
  readonly requiredThemeIds: readonly string[];
  readonly roleTargets: RoleValues;
  readonly roleTolerances: RoleValues;
  readonly semanticRoleTokens: Readonly<Record<string, readonly string[]>>;
  readonly stateTokens: Readonly<Record<ColorState, Readonly<Record<string, string>>>>;
  readonly surfaceRoleTokens: Readonly<Record<string, readonly string[]>>;
  readonly themeTokens: Readonly<Record<string, readonly string[]>>;
  readonly version: number;
}
