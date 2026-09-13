-- CreateTable
CREATE TABLE "password_history" (
    "id" SERIAL NOT NULL,
    "studentId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "password_history_studentId_idx" ON "password_history"("studentId");

-- AddForeignKey
ALTER TABLE "password_history" ADD CONSTRAINT "password_history_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable RLS on the new table immediately (matching every other public
-- table) rather than leaving a gap for the linter to catch later — no
-- policies needed, this app only ever reaches it via Prisma (the `postgres`
-- role, which bypasses RLS regardless).
ALTER TABLE "password_history" ENABLE ROW LEVEL SECURITY;
