/**
 * Qué viene a continuación en el estudio y qué acción lo lleva a cabo.
 * Lo usan el botón «Siguiente» de la pantalla principal (móvil).
 *
 * Devuelve { kicker, main, action } o null cuando no hay nada que hacer.
 *   action: "start" | "firstParagraph" | "nextGroup" | "review" | "nextReview" | "closing" | "finish"
 */
import { t } from "@/i18n";

const groupLabel = (g) => (g && g.paragraphs.length > 1
  ? t("paragraphsN", { n: g.paragraphs.map((p) => p.number).join(", ") })
  : t("paragraphN", { n: g?.firstParagraph?.number || 1 }));

export function getNextStep({
  phase,
  groupedParagraphs = [],
  currentParagraphGroup,
  totalParagraphs = 0,
  finalsCount = 0,
  currentReviewQuestion = 0,
}) {
  switch (phase) {
    case "initial":
      return { kicker: null, main: t("startStudy"), action: "start" };
    case "intro":
      return { kicker: t("next"), main: groupLabel(groupedParagraphs[0]), action: "firstParagraph" };
    case "paragraphs": {
      const last = currentParagraphGroup
        ? currentParagraphGroup.indices[currentParagraphGroup.indices.length - 1]
        : -1;
      if (last >= totalParagraphs - 1) {
        return finalsCount > 0
          ? { kicker: t("next"), main: t("reviewN", { n: 1 }), action: "review" }
          : { kicker: t("next"), main: t("conclusion"), action: "closing" };
      }
      const next = groupedParagraphs.find((g) => g.indices.includes(last + 1));
      return { kicker: t("next"), main: next ? groupLabel(next) : t("paragraph"), action: "nextGroup" };
    }
    case "review":
      return currentReviewQuestion >= finalsCount - 1
        ? { kicker: t("next"), main: t("conclusion"), action: "closing" }
        : { kicker: t("next"), main: t("reviewN", { n: currentReviewQuestion + 2 }), action: "nextReview" };
    case "conclusion":
      return { kicker: null, main: t("finishStudy"), action: "finish" };
    default:
      return null;
  }
}
