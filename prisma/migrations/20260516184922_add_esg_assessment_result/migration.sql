-- CreateTable
CREATE TABLE "ESGAssessmentResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "categoryAuto" TEXT NOT NULL,
    "environmentScore" REAL NOT NULL,
    "socialScore" REAL NOT NULL,
    "governanceScore" REAL NOT NULL,
    "globalScore" REAL NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "redFlags" JSONB NOT NULL,
    "strengths" JSONB NOT NULL,
    "weaknesses" JSONB NOT NULL,
    "recommendations" JSONB NOT NULL,
    "sectionBreakdown" JSONB NOT NULL,
    "sectorWeights" JSONB NOT NULL,
    "engineVersion" TEXT NOT NULL DEFAULT 'RULES_V1',
    "calculatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ESGAssessmentResult_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ESGAssessmentResult_applicationId_key" ON "ESGAssessmentResult"("applicationId");
