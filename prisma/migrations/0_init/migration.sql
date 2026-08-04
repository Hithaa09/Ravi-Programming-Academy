-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "programming_problems" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "topics" JSONB NOT NULL DEFAULT '[]',
    "description" TEXT,
    "inputFormat" TEXT,
    "outputFormat" TEXT,
    "constraints" JSONB NOT NULL DEFAULT '[]',
    "sampleInput" TEXT,
    "sampleOutput" TEXT,
    "explanation" TEXT,
    "testCases" JSONB NOT NULL DEFAULT '[]',
    "hiddenTestCases" JSONB NOT NULL DEFAULT '[]',
    "starterCodeByLanguage" JSONB NOT NULL DEFAULT '{}',
    "officialSolutions" JSONB NOT NULL DEFAULT '{}',
    "timeLimitMs" INTEGER,
    "memoryLimitKb" INTEGER,
    "importedFileName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "availability" TEXT NOT NULL DEFAULT 'Locked',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programming_problems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sql_problems" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "explanation" TEXT,
    "schemaSql" TEXT,
    "sampleDataSql" TEXT,
    "expectedResultColumns" JSONB NOT NULL DEFAULT '[]',
    "expectedResultRows" JSONB NOT NULL DEFAULT '[]',
    "hiddenDatasets" JSONB NOT NULL DEFAULT '[]',
    "solutionQuery" TEXT,
    "dbEngine" TEXT NOT NULL DEFAULT 'MySQL',
    "ignoreRowOrder" BOOLEAN NOT NULL DEFAULT false,
    "ignoreColumnOrder" BOOLEAN NOT NULL DEFAULT false,
    "importedFileName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "availability" TEXT NOT NULL DEFAULT 'Locked',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sql_problems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sql_submissions" (
    "id" SERIAL NOT NULL,
    "studentId" TEXT NOT NULL,
    "studentEmail" TEXT NOT NULL,
    "problemId" INTEGER NOT NULL,
    "problemTitle" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "executionTimeMs" INTEGER NOT NULL,
    "passedDatasets" INTEGER NOT NULL,
    "totalDatasets" INTEGER NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sql_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT,
    "role" TEXT NOT NULL DEFAULT 'student',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programming_submissions" (
    "id" SERIAL NOT NULL,
    "studentId" TEXT NOT NULL,
    "studentEmail" TEXT NOT NULL,
    "problemId" INTEGER NOT NULL,
    "problemTitle" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "executionTimeMs" INTEGER NOT NULL,
    "memoryKb" INTEGER NOT NULL,
    "passedTests" INTEGER NOT NULL,
    "totalTests" INTEGER NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "programming_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programming_submission_locks" (
    "studentId" TEXT NOT NULL,
    "problemId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "programming_submission_locks_pkey" PRIMARY KEY ("studentId","problemId")
);

-- CreateTable
CREATE TABLE "sql_submission_locks" (
    "studentId" TEXT NOT NULL,
    "problemId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sql_submission_locks_pkey" PRIMARY KEY ("studentId","problemId")
);

-- CreateIndex
CREATE INDEX "sql_submissions_studentId_idx" ON "sql_submissions"("studentId");

-- CreateIndex
CREATE INDEX "sql_submissions_problemId_idx" ON "sql_submissions"("problemId");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE INDEX "profiles_role_status_idx" ON "profiles"("role", "status");

-- CreateIndex
CREATE INDEX "programming_submissions_studentId_idx" ON "programming_submissions"("studentId");

-- CreateIndex
CREATE INDEX "programming_submissions_problemId_idx" ON "programming_submissions"("problemId");

-- AddForeignKey
ALTER TABLE "sql_submissions" ADD CONSTRAINT "sql_submissions_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "sql_problems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sql_submissions" ADD CONSTRAINT "sql_submissions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programming_submissions" ADD CONSTRAINT "programming_submissions_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "programming_problems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programming_submissions" ADD CONSTRAINT "programming_submissions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

