function isYes(answer) {
  return answer?.answerValue === "YES";
}

function calculateCategory(answersByCode) {
  const aCodes = Object.keys(answersByCode).filter((code) => code.startsWith("CAT_A_"));
  const bpCodes = Object.keys(answersByCode).filter((code) => code.startsWith("CAT_BP_"));
  const bCodes = Object.keys(answersByCode).filter((code) => code.startsWith("CAT_B_"));

  const hasA = aCodes.some((code) => isYes(answersByCode[code]));
  const hasBp = bpCodes.some((code) => isYes(answersByCode[code]));
  const hasB = bCodes.some((code) => isYes(answersByCode[code]));
  const isFi = isYes(answersByCode.CAT_FI_001);
  const isService = isYes(answersByCode.CAT_C_001);

  if (isFi && (hasA || hasBp || hasB)) {
    return {
      categoryAuto: "À déterminer",
      warning:
        "Incohérence de catégorisation : intermédiaire financier avec risques industriels déclarés.",
    };
  }

  if (hasA) {
    return { categoryAuto: "A", warning: null };
  }

  if (hasBp) {
    return { categoryAuto: "B+", warning: null };
  }

  if (hasB) {
    return { categoryAuto: "B", warning: null };
  }

  if (isFi) {
    return { categoryAuto: "FI", warning: null };
  }

  if (isService) {
    return { categoryAuto: "C", warning: null };
  }

  return { categoryAuto: "À déterminer", warning: "Catégorisation automatique incomplète." };
}

module.exports = {
  calculateCategory,
};
