/***
 * Register the configured Design provider and evaluate a named profile.
 *
 * @title Evaluate Design Evidence
 * @usage
 * @readme
 */
import { createRuleRegistry, evaluateRules } from '@ankhorage/rules';
import {
  createDesignRuleProvider,
  selectDesignRuleProfile,
  type DesignRuleProviderOptions,
} from '@ankhorage/rules-design';

const options: DesignRuleProviderOptions = {
  color: {
    alphaCompositions: {},
    allowedColorSyntaxes: ['hex', 'token'],
    allowedTokens: [],
    canonicalLiterals: {},
    knownTokens: [],
    rampTokens: {},
    requiredBreakpointIds: ['desktop'],
    requiredScopes: ['page', 'viewport', 'scroll-sample'],
    requiredThemeIds: ['light'],
    roleTargets: { accent: 0.1, base: 0.6, secondary: 0.3 },
    roleTolerances: { accent: 0.05, base: 0.05, secondary: 0.05 },
    semanticRoleTokens: {},
    stateTokens: { active: {}, disabled: {}, hover: {} },
    surfaceRoleTokens: {},
    themeTokens: {},
    version: 1,
  },
  typography: {
    allowedFontFamilies: ['Inter'],
    allowedFontSizes: [16, 24, 32],
    allowedFontWeights: ['400', '700'],
    allowedLetterSpacings: [0],
    allowedLineHeights: [20, 30, 40],
    allowedSemanticStyles: { h1: ['display'], h2: ['section'] },
    allowedSpacingAfter: [16],
    allowedSpacingBefore: [24],
    maximumH1Count: 1,
    maximumParagraphMeasure: 75,
    minimumBodyFontSize: 16,
    minimumH1Count: 1,
    minimumParagraphMeasure: 45,
    responsiveFontSizes: { body: [16], hero: [32], section: [24] },
  },
};
const provider = createDesignRuleProvider(options);
const profile = selectDesignRuleProfile('design.60-30-10');
const registry = createRuleRegistry([provider.ruleSet]);
const result = evaluateRules({ facts: [] }, registry.rules, {
  capabilities: ['rendered.area-analysis'],
  selection: profile.selection,
  scope: { id: 'example-design', kind: 'page' },
});

console.log(result.results);
