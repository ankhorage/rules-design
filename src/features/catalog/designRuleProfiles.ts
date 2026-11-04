import type { DesignRuleProfile } from "../../types/designRuleCatalog";
import { designRuleCatalog } from "./designRuleCatalog";

const objectiveRuleIds = designRuleCatalog
  .filter(
    (entry) =>
      entry.assessmentKind === "objective" &&
      !entry.id.startsWith("design.crap"),
  )
  .map((entry) => entry.id);

/*** Declares selectable profiles without adding another executable or composite rule. */
export const designRuleProfiles: readonly DesignRuleProfile[] = [
  {
    description: "Objective baseline design checks.",
    id: "design.quality.base",
    rootRuleIds: objectiveRuleIds,
  },
  {
    description: "Advisory accessibility-oriented checks.",
    id: "design.wcag.advisory",
    rootRuleIds: designRuleCatalog
      .filter(
        (entry) =>
          entry.id.startsWith("design.contrast.") ||
          entry.id.startsWith("design.a11y."),
      )
      .map((entry) => entry.id),
  },
  {
    description: "C.R.A.P. composition profile.",
    id: "design.crap",
    rootRuleIds: ["design.crap"],
  },
  {
    description: "Advisory 60-30-10 visible color-area distribution profile.",
    id: "design.60-30-10",
    rootRuleIds: ["design.color.usage-distribution"],
  },
];
