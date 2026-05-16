function buildRecommendations({ answersByCode, redFlags }) {
  const recommendations = [];
  const strengths = [];
  const weaknesses = [];

  function addRecommendation(priority, pillar, title, sourceCodes) {
    if (!recommendations.some((item) => item.title === title)) {
      recommendations.push({ priority, pillar, title, sourceCodes });
    }
  }

  function addStrength(text) {
    if (!strengths.includes(text)) strengths.push(text);
  }

  function addWeakness(text) {
    if (!weaknesses.includes(text)) weaknesses.push(text);
  }

  if (answersByCode.CERT_005?.answerValue === "YES") addStrength("Certification HACCP déclarée.");
  if (answersByCode.CERT_007?.answerValue === "YES") addStrength("Certification ISO 9001 déclarée.");
  if (answersByCode.CERT_008?.answerValue === "YES") addStrength("Certification ISO 14001 déclarée.");
  if (answersByCode.NP1_001?.answerValue === "YES") addStrength("Système de gestion des risques E&S déclaré.");
  if (answersByCode.NP2_HR_Q007?.answerValue === "YES") addStrength("Contrats de travail déclarés pour le personnel.");
  if (answersByCode.NP2_HR_Q009?.answerValue === "YES") addStrength("Déclaration du personnel à la sécurité sociale déclarée.");
  if (answersByCode.CLIMATE_007?.answerValue === "YES") addStrength("Sensibilisation climatique déclarée.");
  if (answersByCode.CLIMATE_008?.answerValue === "YES") addStrength("Plan de transition énergétique engagé.");

  for (const flag of redFlags) {
    if (flag.severity === "CRITICAL" || flag.severity === "MAJOR") {
      addWeakness(flag.message);
    }
  }

  if (answersByCode.NP1_001?.answerValue === "NO") {
    addRecommendation(
      "HIGH",
      "Governance",
      "Mettre en place un système d’évaluation et de suivi des risques E&S.",
      ["NP1_001"]
    );
  }

  if (answersByCode.REG_001?.answerValue === "NO" || answersByCode.REG_003?.answerValue === "NO" || answersByCode.REG_005?.answerValue === "NO") {
    addRecommendation(
      "HIGH",
      "Governance",
      "Compléter les autorisations réglementaires manquantes.",
      ["REG_001", "REG_003", "REG_005"]
    );
  }

  if (answersByCode.NP2_HR_Q010?.answerValue === "NO") {
    addRecommendation(
      "MEDIUM",
      "Governance",
      "Formaliser les politiques et procédures RH.",
      ["NP2_HR_Q010"]
    );
  }

  if (answersByCode.NP2_HR_Q016?.answerValue === "NO") {
    addRecommendation(
      "HIGH",
      "Social",
      "Mettre en place un suivi des accidents du travail.",
      ["NP2_HR_Q016", "NP2_HR_ACCIDENT_TABLE"]
    );
  }

  if (answersByCode.NP2_HS_B2_020?.answerValue === "NO") {
    addRecommendation(
      "HIGH",
      "Social",
      "Mettre en place un plan de sécurité / évacuation.",
      ["NP2_HS_B2_020"]
    );
  }

  if (answersByCode.NP2_HS_B2_003?.answerValue === "NO" || answersByCode.NP2_HS_B2_019?.answerValue === "NO") {
    addRecommendation(
      "MEDIUM",
      "Social",
      "Former le personnel à la sécurité et à la sécurité incendie.",
      ["NP2_HS_B2_003", "NP2_HS_B2_019"]
    );
  }

  if (answersByCode.CLIMATE_008?.answerValue === "NO" || answersByCode.CLIMATE_008?.answerValue === "PLANNED") {
    addRecommendation(
      "MEDIUM",
      "Environment",
      "Définir un plan de transition énergétique.",
      ["CLIMATE_008", "CLIMATE_010", "CLIMATE_011"]
    );
  }

  if (redFlags.some((flag) => flag.questionCode === "NP3_LIQUID_WASTE_TABLE")) {
    addRecommendation(
      "HIGH",
      "Environment",
      "Mettre en place un suivi régulier des rejets liquides et un prétraitement adapté.",
      ["NP3_LIQUID_WASTE_TABLE"]
    );
  }

  if (redFlags.some((flag) => flag.questionCode === "NP3_AIR_EMISSIONS_TABLE")) {
    addRecommendation(
      "HIGH",
      "Environment",
      "Renforcer le contrôle et le traitement des émissions atmosphériques.",
      ["NP3_AIR_EMISSIONS_TABLE"]
    );
  }

  if (redFlags.some((flag) => flag.questionCode === "NP3_HAZARDOUS_MATERIALS_TABLE")) {
    addRecommendation(
      "HIGH",
      "Environment",
      "Mettre sous contrôle l’utilisation des matières dangereuses et la gestion des déchets associés.",
      ["NP3_HAZARDOUS_MATERIALS_TABLE"]
    );
  }

  if (answersByCode.NP2_HR_SUPPLIERS_001?.answerValue === "NO") {
    addRecommendation(
      "MEDIUM",
      "Governance",
      "Renforcer les dispositifs de protection des sous-traitants et fournisseurs.",
      ["NP2_HR_SUPPLIERS_001"]
    );
  }

  return {
    strengths,
    weaknesses,
    recommendations,
  };
}

module.exports = {
  buildRecommendations,
};
