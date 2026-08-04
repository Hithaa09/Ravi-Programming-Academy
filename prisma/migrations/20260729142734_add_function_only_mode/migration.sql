-- AlterTable
ALTER TABLE "programming_problems" ADD COLUMN     "executionStyle" TEXT NOT NULL DEFAULT 'FULL_PROGRAM',
ADD COLUMN     "functionHiddenTestCases" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "functionSignature" JSONB,
ADD COLUMN     "functionTestCases" JSONB NOT NULL DEFAULT '[]';
