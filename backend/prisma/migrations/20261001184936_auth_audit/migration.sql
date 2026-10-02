-- DropIndex
DROP INDEX "candidate_name_trgm";

-- AlterTable
ALTER TABLE "tenant" ADD COLUMN     "retentionDays" INTEGER NOT NULL DEFAULT 365;

-- CreateTable
CREATE TABLE "refresh_token" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "revokedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "refresh_token_tokenHash_key" ON "refresh_token"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_token_userId_idx" ON "refresh_token"("userId");

-- CreateIndex
CREATE INDEX "audit_log_tenantId_createdAt_idx" ON "audit_log"("tenantId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
