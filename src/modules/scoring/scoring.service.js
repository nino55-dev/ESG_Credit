const { PrismaClient } = require("@prisma/client");

const ApiError = require("../../utils/apiError");
const { calculateCategory } = require("./scoring.category");
const { calculatePillars } = require("./scoring.pillars");
const { buildRedFlags } = require("./scoring.redFlags");
const { buildRecommendations } = require("./scoring.recommendations");
const { detectSector } = require("./scoring.sectorWeights");
const { roundScore } = require("./scoring.rules");

const prisma = new PrismaClient();
const ENGINE_VERSION = "RULES_V1";
const RISK_ORDER = ["Faible", "Modéré", "Substantiel", "Élevé"];

function parseProjectProfileDetails(projectProfile) {
  if (!projectProfile?.projectSummary) {
    return {};
  }

  try {
    return JSON.parse(projectProfile.projectSummary);
  } catch (error) {
    return {};
  }
}

function buildQuestionMeta(formTemplate) {
  const questionMeta = {};

  for (const section of formTemplate?.sections || []) {
    for (const question of section.questions || []) {
      questionMeta[question.code] = {
        label: question.label,
        type: question.type,
        sectionCode: section.code,
        sectionTitle: section.title,
      };
    }
  }

  return questionMeta;
}

function buildAnswersByCode(answers) {
  return answers.reduce((accumulator, answer) => {
    accumulator[answer.questionCode] = answer;
    return accumulator;
  }, {});
}

function clampRisk(level) {
  const index = RISK_ORDER.indexOf(level);
  return Math.max(0, index);
}

function resolveRiskLevel({ categoryAuto, globalScore, governanceScore, redFlags }) {
  const baseByCategory = {
    A: "Substantiel",
    "B+": "Substantiel",
    B: "Modéré",
    C: "Faible",
    FI: "Modéré",
    "À déterminer": "Modéré",
  };

  let riskIndex = clampRisk(baseByCategory[categoryAuto] || "Modéré");

  if (globalScore >= 80) riskIndex -= 1;
  else if (globalScore >= 60) riskIndex += 0;
  else if (globalScore >= 40) riskIndex += 1;
  else riskIndex += 2;

  const criticalCount = redFlags.filter((flag) => flag.severity === "CRITICAL").length;
  const majorCount = redFlags.filter((flag) => flag.severity === "MAJOR").length;

  if (criticalCount > 0) {
    riskIndex = Math.max(riskIndex, RISK_ORDER.indexOf("Élevé"));
  } else if (majorCount >= 2) {
    riskIndex = Math.max(riskIndex, RISK_ORDER.indexOf("Substantiel"));
  }

  if (categoryAuto === "A" && majorCount >= 1) {
    riskIndex = Math.max(riskIndex, RISK_ORDER.indexOf("Élevé"));
  }

  if (categoryAuto === "FI" && governanceScore < 50) {
    riskIndex = Math.max(riskIndex, RISK_ORDER.indexOf("Substantiel"));
  }

  riskIndex = Math.min(Math.max(riskIndex, 0), RISK_ORDER.length - 1);
  return RISK_ORDER[riskIndex];
}

function getGlobalScore(scores, weights) {
  return roundScore(
    scores.environmentScore * weights.environment +
      scores.socialScore * weights.social +
      scores.governanceScore * weights.governance
  );
}

function mergeUnique(primary, secondary) {
  const merged = new Set([...(primary || []), ...(secondary || [])]);
  return Array.from(merged);
}

function toResponse(result) {
  return {
    id: result.id,
    applicationId: result.applicationId,
    categoryAuto: result.categoryAuto,
    scores: {
      environment: result.environmentScore,
      social: result.socialScore,
      governance: result.governanceScore,
      global: result.globalScore,
    },
    riskLevel: result.riskLevel,
    sector: result.sectorWeights?.sector || "Général",
    sectorWeights: result.sectorWeights,
    redFlags: result.redFlags,
    strengths: result.strengths,
    weaknesses: result.weaknesses,
    recommendations: result.recommendations,
    sectionBreakdown: result.sectionBreakdown,
    engineVersion: result.engineVersion,
    calculatedAt: result.calculatedAt,
  };
}

async function loadAssessmentContext(applicationId) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      company: true,
      projectProfile: true,
      questionnaireAnswers: true,
    },
  });

  if (!application) {
    throw new ApiError("Demande introuvable.", 404);
  }

  const formTemplate = await prisma.formTemplate.findFirst({
    where: { isActive: true },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: {
          questions: {
            orderBy: { order: "asc" },
            include: {
              options: {
                orderBy: { order: "asc" },
              },
            },
          },
        },
      },
    },
  });

  if (!formTemplate) {
    throw new ApiError("Aucun formulaire actif trouvé pour le calcul ESG.", 404);
  }

  return { application, formTemplate };
}

async function calculate(applicationId) {
  const { application, formTemplate } = await loadAssessmentContext(applicationId);
  const profileDetails = parseProjectProfileDetails(application.projectProfile);
  const answersByCode = buildAnswersByCode(application.questionnaireAnswers || []);
  const questionMeta = buildQuestionMeta(formTemplate);
  const category = calculateCategory(answersByCode);
  const sectorWeights = detectSector(application, profileDetails);
  const pillarResult = calculatePillars(answersByCode, questionMeta);
  const redFlags = buildRedFlags({
    answersByCode,
    category,
    detectedSector: sectorWeights.sector,
  });
  const recommendationResult = buildRecommendations({ answersByCode, redFlags });

  const environmentScore = pillarResult.environmentScore;
  const socialScore = pillarResult.socialScore;
  const governanceScore = pillarResult.governanceScore;
  const globalScore = getGlobalScore(
    { environmentScore, socialScore, governanceScore },
    sectorWeights
  );
  const riskLevel = resolveRiskLevel({
    categoryAuto: category.categoryAuto,
    globalScore,
    governanceScore,
    redFlags,
  });

  const record = await prisma.eSGAssessmentResult.upsert({
    where: { applicationId },
    update: {
      categoryAuto: category.categoryAuto,
      environmentScore,
      socialScore,
      governanceScore,
      globalScore,
      riskLevel,
      redFlags,
      strengths: mergeUnique(pillarResult.strengths, recommendationResult.strengths),
      weaknesses: mergeUnique(pillarResult.weaknesses, recommendationResult.weaknesses),
      recommendations: recommendationResult.recommendations,
      sectionBreakdown: pillarResult.sectionBreakdown,
      sectorWeights,
      engineVersion: ENGINE_VERSION,
      calculatedAt: new Date(),
    },
    create: {
      applicationId,
      categoryAuto: category.categoryAuto,
      environmentScore,
      socialScore,
      governanceScore,
      globalScore,
      riskLevel,
      redFlags,
      strengths: mergeUnique(pillarResult.strengths, recommendationResult.strengths),
      weaknesses: mergeUnique(pillarResult.weaknesses, recommendationResult.weaknesses),
      recommendations: recommendationResult.recommendations,
      sectionBreakdown: pillarResult.sectionBreakdown,
      sectorWeights,
      engineVersion: ENGINE_VERSION,
      calculatedAt: new Date(),
    },
  });

  await prisma.application.update({
    where: { id: applicationId },
    data: {
      categoryAuto: category.categoryAuto,
    },
  });

  return toResponse(record);
}

async function getByApplicationId(applicationId) {
  const result = await prisma.eSGAssessmentResult.findUnique({
    where: { applicationId },
  });

  if (!result) {
    throw new ApiError("Aucun bilan ESG calculé pour cette demande.", 404);
  }

  return toResponse(result);
}

module.exports = {
  calculate,
  getByApplicationId,
};
