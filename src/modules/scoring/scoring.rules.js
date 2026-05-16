function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isYes(answer) {
  return answer?.answerValue === "YES";
}

function isNo(answer) {
  return answer?.answerValue === "NO";
}

function isPlanned(answer) {
  return answer?.answerValue === "PLANNED";
}

function isNa(answer) {
  return answer?.answerValue === "NA";
}

function isNsp(value) {
  return value === "NSP";
}

function hasDetails(answer) {
  return String(answer?.answerValue || answer?.comment || "").trim().length > 0;
}

function positiveAnswerScore(answer) {
  const value = answer?.answerValue;

  if (!value || isNa(answer)) {
    return null;
  }

  if (value === "YES") return 100;
  if (value === "NO") return 0;
  if (value === "PLANNED") return 50;
  if (value === "NSP") return 30;

  return null;
}

function eiaStatusScore(answer) {
  const value = answer?.answerValue;

  if (!value) return null;
  if (value === "APPROVED_WITHOUT_RESERVES") return 100;
  if (value === "APPROVED_WITH_RESERVES") return 75;
  if (value === "UNDER_APPROVAL") return 50;
  if (value === "IN_PROGRESS") return 25;
  return null;
}

function parseTable(answer) {
  if (!answer?.answerValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(answer.answerValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function findRow(rows, text) {
  const target = normalize(text);
  return rows.find((row) => normalize(row.label).includes(target)) || null;
}

function responseScore(value) {
  if (!value) return null;
  if (value === "YES") return 100;
  if (value === "NO") return 0;
  if (value === "PLANNED") return 50;
  if (value === "NSP") return 30;
  return null;
}

function average(scores) {
  const filtered = scores.filter((score) => typeof score === "number");
  if (!filtered.length) {
    return null;
  }

  return filtered.reduce((sum, score) => sum + score, 0) / filtered.length;
}

function roundScore(score) {
  if (typeof score !== "number" || Number.isNaN(score)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(score * 100) / 100));
}

module.exports = {
  average,
  eiaStatusScore,
  findRow,
  hasDetails,
  isNo,
  isNsp,
  isPlanned,
  isYes,
  normalize,
  parseTable,
  positiveAnswerScore,
  responseScore,
  roundScore,
};
