/**
 * Qué viene a continuación en el estudio y qué acción lo lleva a cabo.
 * Lo usan el botón «Siguiente» de la pantalla principal (móvil).
 *
 * Devuelve { kicker, main, action } o null cuando no hay nada que hacer.
 *   action: "start" | "firstParagraph" | "nextGroup" | "review" | "nextReview" | "closing" | "finish"
 */
const groupLabel = (g) => (g && g.paragraphs.length > 1
  ? `Párrafos ${g.paragraphs.map((p) => p.number).join(", ")}`
  : `Párrafo ${g?.firstParagraph?.number || 1}`);

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
      return { kicker: null, main: "Iniciar estudio", action: "start" };
    case "intro":
      return { kicker: "Siguiente", main: groupLabel(groupedParagraphs[0]), action: "firstParagraph" };
    case "paragraphs": {
      const last = currentParagraphGroup
        ? currentParagraphGroup.indices[currentParagraphGroup.indices.length - 1]
        : -1;
      if (last >= totalParagraphs - 1) {
        return finalsCount > 0
          ? { kicker: "Siguiente", main: "Repaso 1", action: "review" }
          : { kicker: "Siguiente", main: "Conclusión", action: "closing" };
      }
      const next = groupedParagraphs.find((g) => g.indices.includes(last + 1));
      return { kicker: "Siguiente", main: next ? groupLabel(next) : "Párrafo", action: "nextGroup" };
    }
    case "review":
      return currentReviewQuestion >= finalsCount - 1
        ? { kicker: "Siguiente", main: "Conclusión", action: "closing" }
        : { kicker: "Siguiente", main: `Repaso ${currentReviewQuestion + 2}`, action: "nextReview" };
    case "conclusion":
      return { kicker: null, main: "Finalizar estudio", action: "finish" };
    default:
      return null;
  }
}
