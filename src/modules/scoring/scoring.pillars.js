const {
  average,
  eiaStatusScore,
  findRow,
  hasDetails,
  isNo,
  isPlanned,
  isYes,
  parseTable,
  positiveAnswerScore,
  responseScore,
  roundScore,
} = require("./scoring.rules");

function getQuestionLabel(questionMeta, code) {
  return questionMeta[code]?.label || code;
}

function calculateRiskMitigationScore(riskAnswer, detailAnswer) {
  if (isNo(riskAnswer)) {
    return 100;
  }

  if (isYes(riskAnswer)) {
    return hasDetails(detailAnswer) ? 60 : 0;
  }

  return null;
}

function calculateExposureScore(answer) {
  if (isNo(answer)) {
    return 100;
  }

  if (isYes(answer)) {
    return 60;
  }

  return null;
}

function calculateClimateScore(answersByCode) {
  const planScore = positiveAnswerScore(answersByCode.CLIMATE_008);
  const awarenessScore = positiveAnswerScore(answersByCode.CLIMATE_007);
  const plannedYearScore =
    isPlanned(answersByCode.CLIMATE_008) && answersByCode.CLIMATE_009?.answerValue ? 100 : null;
  const transitionDetailScore =
    isYes(answersByCode.CLIMATE_008) && hasDetails(answersByCode.CLIMATE_010)
      ? 100
      : isYes(answersByCode.CLIMATE_008)
        ? 30
        : null;
  const investmentValue = Number(answersByCode.CLIMATE_011?.answerValue || 0);
  const investmentScore = investmentValue > 0 ? 100 : 20;
  const awarenessList = [
    awarenessScore,
    planScore,
    plannedYearScore,
    transitionDetailScore,
    investmentScore,
  ];

  return average(awarenessList);
}

function createAccumulator() {
  return {
    environmentScores: [],
    socialScores: [],
    governanceScores: [],
    strengths: new Set(),
    weaknesses: new Set(),
    sectionBreakdown: [],
  };
}

function addSection(accumulator, { sectionCode, sectionTitle, pillar, score, summary }) {
  if (typeof score !== "number") {
    return;
  }

  const rounded = roundScore(score);

  if (pillar === "Environment") accumulator.environmentScores.push(rounded);
  if (pillar === "Social") accumulator.socialScores.push(rounded);
  if (pillar === "Governance") accumulator.governanceScores.push(rounded);

  accumulator.sectionBreakdown.push({
    sectionCode,
    sectionTitle,
    pillar,
    score: rounded,
    summary,
  });
}

function scoreRegulatory(answersByCode, questionMeta, accumulator) {
  const score = average([
    positiveAnswerScore(answersByCode.REG_001),
    eiaStatusScore(answersByCode.REG_002),
    positiveAnswerScore(answersByCode.REG_003),
    positiveAnswerScore(answersByCode.REG_004),
    positiveAnswerScore(answersByCode.REG_005),
  ]);

  if (isYes(answersByCode.REG_001)) {
    accumulator.strengths.add("Étude d’impact environnemental déclarée.");
  }
  if (isNo(answersByCode.REG_001)) {
    accumulator.weaknesses.add("Étude d’impact environnemental absente.");
  }

  addSection(accumulator, {
    sectionCode: "REGULATORY_COMPLIANCE",
    sectionTitle: questionMeta.REG_001?.sectionTitle || "Réglementation nationale",
    pillar: "Governance",
    score,
    summary:
      score >= 75
        ? "Conformité réglementaire globalement satisfaisante."
        : "Conformité réglementaire partielle ou incomplète.",
  });
}

function scoreCertifications(answersByCode, questionMeta, accumulator) {
  const score = average([
    positiveAnswerScore(answersByCode.CERT_001),
    positiveAnswerScore(answersByCode.CERT_005),
    positiveAnswerScore(answersByCode.CERT_006),
    positiveAnswerScore(answersByCode.CERT_007),
    positiveAnswerScore(answersByCode.CERT_008),
    positiveAnswerScore(answersByCode.CERT_010),
  ]);

  if (isYes(answersByCode.CERT_005)) accumulator.strengths.add("Certification HACCP déclarée.");
  if (isYes(answersByCode.CERT_007)) accumulator.strengths.add("Certification ISO 9001 déclarée.");
  if (isYes(answersByCode.CERT_008)) accumulator.strengths.add("Certification ISO 14001 déclarée.");

  addSection(accumulator, {
    sectionCode: "CERTIFICATIONS",
    sectionTitle: questionMeta.CERT_001?.sectionTitle || "Certifications et autorisations",
    pillar: "Governance",
    score,
    summary:
      score >= 75
        ? "Référentiels et certifications globalement bien structurés."
        : "Couverture de certification limitée ou partielle.",
  });
}

function scoreNp1(answersByCode, questionMeta, accumulator) {
  const codes = ["NP1_001", "NP1_002", "NP1_003", "NP1_004", "NP1_005", "NP1_006", "NP1_007", "NP1_008"];
  const score = average(codes.map((code) => positiveAnswerScore(answersByCode[code])));

  if (isYes(answersByCode.NP1_001)) {
    accumulator.strengths.add("Système d’évaluation et de suivi des risques E&S déclaré.");
  }
  if (isNo(answersByCode.NP1_001)) {
    accumulator.weaknesses.add("Absence de système formalisé d’évaluation et de suivi des risques E&S.");
  }

  addSection(accumulator, {
    sectionCode: "PERFORMANCE_STANDARD_1",
    sectionTitle:
      questionMeta.NP1_001?.sectionTitle ||
      "Norme de performance 1 — Évaluation et gestion des risques et des impacts environnementaux et sociaux",
    pillar: "Governance",
    score,
    summary:
      score >= 75
        ? "Le système de gestion E&S apparaît structuré."
        : "Le système de gestion E&S apparaît incomplet ou peu formalisé.",
  });
}

function scoreHsBloc1(answersByCode, questionMeta, accumulator) {
  const codes = [
    "NP2_HS_B1_001",
    "NP2_HS_B1_002",
    "NP2_HS_B1_003",
    "NP2_HS_B1_004",
    "NP2_HS_B1_005",
    "NP2_HS_B1_006",
    "NP2_HS_B1_007",
  ];
  const score = average(codes.map((code) => calculateExposureScore(answersByCode[code])));
  const yesCount = codes.filter((code) => isYes(answersByCode[code])).length;

  if (yesCount >= 3) {
    accumulator.weaknesses.add("Plusieurs nuisances opérationnelles ou expositions HSE sont déclarées.");
  }

  addSection(accumulator, {
    sectionCode: "PERFORMANCE_STANDARD_2_HS_BLOC_1",
    sectionTitle: questionMeta.NP2_HS_B1_001?.sectionTitle || "Norme de performance 2 — Bloc 1",
    pillar: "Social",
    score,
    summary:
      yesCount === 0
        ? "Peu de nuisances HSE déclarées."
        : "Présence de nuisances ou expositions HSE nécessitant un encadrement.",
  });
}

function scoreHsBloc2(answersByCode, questionMeta, accumulator) {
  const booleanCodes = [
    "NP2_HS_B2_001",
    "NP2_HS_B2_002",
    "NP2_HS_B2_003",
    "NP2_HS_B2_004",
    "NP2_HS_B2_005",
    "NP2_HS_B2_006",
    "NP2_HS_B2_007",
    "NP2_HS_B2_008",
    "NP2_HS_B2_009",
    "NP2_HS_B2_010",
    "NP2_HS_B2_011",
    "NP2_HS_B2_012",
    "NP2_HS_B2_013",
    "NP2_HS_B2_014",
    "NP2_HS_B2_016",
    "NP2_HS_B2_019",
    "NP2_HS_B2_020",
    "NP2_HS_B2_021",
    "NP2_HS_B2_022",
  ];
  const score = average([
    ...booleanCodes.map((code) => positiveAnswerScore(answersByCode[code])),
    positiveAnswerScore(answersByCode.NP2_HS_B2_017),
  ]);

  if (isYes(answersByCode.NP2_HS_B2_020)) {
    accumulator.strengths.add("Plan de sécurité / évacuation déclaré.");
  }
  if (isNo(answersByCode.NP2_HS_B2_020)) {
    accumulator.weaknesses.add("Absence de plan de sécurité / évacuation.");
  }

  addSection(accumulator, {
    sectionCode: "PERFORMANCE_STANDARD_2_HS_BLOC_2",
    sectionTitle: questionMeta.NP2_HS_B2_001?.sectionTitle || "Norme de performance 2 — Bloc 2",
    pillar: "Social",
    score,
    summary:
      score >= 75
        ? "Les dispositifs HSE sont globalement en place."
        : "Les dispositifs HSE apparaissent partiels ou insuffisants.",
  });
}

function scoreHr(answersByCode, questionMeta, accumulator) {
  const hrCodes = [
    "NP2_HR_Q001",
    "NP2_HR_Q002",
    "NP2_HR_Q005",
    "NP2_HR_Q006",
    "NP2_HR_Q007",
    "NP2_HR_Q008",
    "NP2_HR_Q009",
    "NP2_HR_Q010",
    "NP2_HR_Q011",
    "NP2_HR_Q012",
    "NP2_HR_Q013",
    "NP2_HR_Q014",
    "NP2_HR_Q015",
    "NP2_HR_Q016",
    "NP2_HR_SUPPLIERS_001",
  ];
  const scores = hrCodes.map((code) => positiveAnswerScore(answersByCode[code]));
  const accidentRows = parseTable(answersByCode.NP2_HR_ACCIDENT_TABLE);
  const totalOccurrences = accidentRows.reduce(
    (sum, row) => sum + Number(row.occurrence || 0),
    0
  );

  if (totalOccurrences > 5) {
    scores.push(35);
    accumulator.weaknesses.add("Sinistralité travail élevée sur la période déclarée.");
  } else if (totalOccurrences > 2) {
    scores.push(60);
  } else if (accidentRows.length > 0) {
    scores.push(80);
  }

  if (isYes(answersByCode.NP2_HR_Q010)) {
    accumulator.strengths.add("Politiques et procédures RH déclarées.");
  }
  if (isNo(answersByCode.NP2_HR_Q010)) {
    accumulator.weaknesses.add("Absence de politiques et procédures RH formalisées.");
  }
  if (isYes(answersByCode.NP2_HR_Q009)) {
    accumulator.strengths.add("Personnel déclaré à la sécurité sociale.");
  }

  addSection(accumulator, {
    sectionCode: "PERFORMANCE_STANDARD_2_HR",
    sectionTitle:
      questionMeta.NP2_HR_Q001?.sectionTitle ||
      "Norme de performance 2 — Gestion des ressources humaines",
    pillar: "Social",
    score: average(scores),
    summary:
      average(scores) >= 75
        ? "Les pratiques RH apparaissent globalement structurées."
        : "Les pratiques RH présentent plusieurs faiblesses de conformité ou d’encadrement.",
  });
}

function scoreSimpleControlTable(answer, controlLabels) {
  const rows = parseTable(answer);
  const firstRow = rows[0];

  if (!firstRow) {
    return null;
  }

  if (firstRow.response === "NO") {
    return 100;
  }

  const controlScores = controlLabels.map((label) => {
    const row = findRow(rows, label);
    return responseScore(row?.response);
  });

  return average(controlScores);
}

function scoreEmergencyTable(answer) {
  const rows = parseTable(answer);
  if (!rows.length) return null;

  const procedureScore = responseScore(findRow(rows, "procedures d’urgence")?.response);
  const installationScore = responseScore(findRow(rows, "bon etat")?.response);
  const standardsScore = responseScore(findRow(rows, "normes internes")?.response);
  const pollutionRow = findRow(rows, "pollution des sols");
  const pollutionScore =
    pollutionRow?.response === "YES" ? 0 : pollutionRow?.response === "NO" ? 100 : 30;

  return average([procedureScore, installationScore, standardsScore, pollutionScore]);
}

function scoreNorme3(answersByCode, questionMeta, accumulator) {
  const liquidScore = scoreSimpleControlTable(answersByCode.NP3_LIQUID_WASTE_TABLE, [
    "raccordement",
    "prétraitement",
    "contrôle régulier",
  ]);
  const solidScore = scoreSimpleControlTable(answersByCode.NP3_SOLID_WASTE_TABLE, [
    "collecte séparative",
    "valorisation",
    "contrôle et un suivi",
  ]);
  const airScore = scoreSimpleControlTable(answersByCode.NP3_AIR_EMISSIONS_TABLE, [
    "contrôle et un suivi",
    "ventilation forcée",
    "systèmes de traitement d’air",
  ]);
  const hazardousScore = scoreSimpleControlTable(answersByCode.NP3_HAZARDOUS_MATERIALS_TABLE, [
    "contrôle et un suivi",
    "prévenir la production",
  ]);
  const emergencyScore = scoreEmergencyTable(answersByCode.NP3_EMERGENCY_PREPAREDNESS_TABLE);

  addSection(accumulator, {
    sectionCode: "PERFORMANCE_STANDARD_3_LIQUID_WASTE",
    sectionTitle:
      questionMeta.NP3_LIQUID_WASTE_TABLE?.sectionTitle ||
      "Norme de performance 3 — Gestion des déchets liquides",
    pillar: "Environment",
    score: liquidScore,
    summary:
      liquidScore >= 75
        ? "Gestion des rejets liquides globalement maîtrisée."
        : "Gestion des rejets liquides partielle ou insuffisante.",
  });
  addSection(accumulator, {
    sectionCode: "PERFORMANCE_STANDARD_3_SOLID_WASTE",
    sectionTitle:
      questionMeta.NP3_SOLID_WASTE_TABLE?.sectionTitle ||
      "Norme de performance 3 — Gestion des déchets solides",
    pillar: "Environment",
    score: solidScore,
    summary:
      solidScore >= 75
        ? "Gestion des déchets solides globalement structurée."
        : "Gestion des déchets solides à renforcer.",
  });
  addSection(accumulator, {
    sectionCode: "PERFORMANCE_STANDARD_3_AIR_EMISSIONS",
    sectionTitle:
      questionMeta.NP3_AIR_EMISSIONS_TABLE?.sectionTitle ||
      "Norme de performance 3 — Émissions gazeuses",
    pillar: "Environment",
    score: airScore,
    summary:
      airScore >= 75
        ? "Suivi et traitement des émissions atmosphériques globalement satisfaisants."
        : "Contrôle des émissions atmosphériques insuffisant ou partiel.",
  });
  addSection(accumulator, {
    sectionCode: "PERFORMANCE_STANDARD_3_HAZARDOUS_MATERIALS",
    sectionTitle:
      questionMeta.NP3_HAZARDOUS_MATERIALS_TABLE?.sectionTitle ||
      "Norme de performance 3 — Matières dangereuses",
    pillar: "Environment",
    score: hazardousScore,
    summary:
      hazardousScore >= 75
        ? "Encadrement des matières dangereuses globalement satisfaisant."
        : "Encadrement des matières dangereuses à renforcer.",
  });
  addSection(accumulator, {
    sectionCode: "PERFORMANCE_STANDARD_3_EMERGENCY_PREPAREDNESS",
    sectionTitle:
      questionMeta.NP3_EMERGENCY_PREPAREDNESS_TABLE?.sectionTitle ||
      "Norme de performance 3 — Préparation aux situations d’urgence",
    pillar: "Environment",
    score: emergencyScore,
    summary:
      emergencyScore >= 75
        ? "Préparation aux situations d’urgence globalement satisfaisante."
        : "Préparation aux situations d’urgence insuffisante ou partielle.",
  });
}

function scoreMitigationSection(questionCode, detailCode, pillar, accumulator, questionMeta) {
  const score = calculateRiskMitigationScore(
    accumulator.answersByCode[questionCode],
    accumulator.answersByCode[detailCode]
  );

  addSection(accumulator, {
    sectionCode: questionMeta[questionCode]?.sectionCode || questionCode,
    sectionTitle: questionMeta[questionCode]?.sectionTitle || getQuestionLabel(questionMeta, questionCode),
    pillar,
    score,
    summary:
      score >= 75
        ? "Le risque déclaré apparaît faible ou correctement encadré."
        : "Le risque déclaré nécessite un encadrement ou des mesures d’atténuation plus solides.",
  });
}

function scoreClimate(answersByCode, questionMeta, accumulator) {
  const score = calculateClimateScore(answersByCode);

  if (isYes(answersByCode.CLIMATE_007)) {
    accumulator.strengths.add("Conscience des enjeux climatiques déclarée.");
  }
  if (isYes(answersByCode.CLIMATE_008)) {
    accumulator.strengths.add("Plan de transition énergétique engagé.");
  }
  if (isPlanned(answersByCode.CLIMATE_008)) {
    accumulator.weaknesses.add("Plan de transition énergétique encore au stade de projet.");
  }

  addSection(accumulator, {
    sectionCode: "CLIMATE_QUESTIONS",
    sectionTitle: questionMeta.CLIMATE_001?.sectionTitle || "Questions climatiques",
    pillar: "Environment",
    score,
    summary:
      score >= 75
        ? "Maturité climatique globalement satisfaisante."
        : "Maturité climatique partielle ou à renforcer.",
  });
}

function calculatePillars(answersByCode, questionMeta) {
  const accumulator = createAccumulator();
  accumulator.answersByCode = answersByCode;

  scoreRegulatory(answersByCode, questionMeta, accumulator);
  scoreCertifications(answersByCode, questionMeta, accumulator);
  scoreNp1(answersByCode, questionMeta, accumulator);
  scoreHsBloc1(answersByCode, questionMeta, accumulator);
  scoreHsBloc2(answersByCode, questionMeta, accumulator);
  scoreHr(answersByCode, questionMeta, accumulator);
  scoreNorme3(answersByCode, questionMeta, accumulator);

  scoreMitigationSection("NP4_001", "NP4_001_DETAILS", "Social", accumulator, questionMeta);
  scoreMitigationSection("NP4_002", "NP4_002_DETAILS", "Social", accumulator, questionMeta);
  scoreMitigationSection("NP4_003", "NP4_003_DETAILS", "Social", accumulator, questionMeta);
  scoreMitigationSection("NP5_001", "NP5_001_DETAILS", "Social", accumulator, questionMeta);
  scoreMitigationSection("NP6_001", "NP6_001_DETAILS", "Environment", accumulator, questionMeta);
  scoreMitigationSection("NP6_002", "NP6_002_DETAILS", "Environment", accumulator, questionMeta);
  scoreMitigationSection("NP7_001", "NP7_001_DETAILS", "Social", accumulator, questionMeta);
  scoreMitigationSection("NP8_001", "NP8_001_DETAILS", "Social", accumulator, questionMeta);
  scoreClimate(answersByCode, questionMeta, accumulator);

  return {
    environmentScore: roundScore(average(accumulator.environmentScores)),
    socialScore: roundScore(average(accumulator.socialScores)),
    governanceScore: roundScore(average(accumulator.governanceScores)),
    strengths: Array.from(accumulator.strengths),
    weaknesses: Array.from(accumulator.weaknesses),
    sectionBreakdown: accumulator.sectionBreakdown,
  };
}

module.exports = {
  calculatePillars,
};
