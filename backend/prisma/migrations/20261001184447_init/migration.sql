-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'RECRUITER');

-- CreateEnum
CREATE TYPE "Factor" AS ENUM ('D', 'I', 'S', 'C');

-- CreateEnum
CREATE TYPE "QuestionnaireStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'STARTED', 'COMPLETED', 'EXPIRED', 'REVOKED');

-- CreateTable
CREATE TABLE "tenant" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_type" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "assessment_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questionnaire" (
    "id" UUID NOT NULL,
    "assessmentTypeId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "QuestionnaireStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMPTZ,

    CONSTRAINT "questionnaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_group" (
    "id" UUID NOT NULL,
    "questionnaireId" UUID NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "question_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_option" (
    "id" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "factor" "Factor" NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "question_option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitation" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "questionnaireId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "targetRole" TEXT,
    "targetDepartment" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "invitationId" UUID NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "consentAt" TIMESTAMPTZ NOT NULL,
    "consentVersion" TEXT NOT NULL,
    "submittedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "birthDate" DATE NOT NULL,

    CONSTRAINT "candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answer" (
    "id" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "optionId" UUID NOT NULL,
    "rank" SMALLINT NOT NULL,

    CONSTRAINT "answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_result" (
    "id" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "scoreD" INTEGER NOT NULL,
    "scoreI" INTEGER NOT NULL,
    "scoreS" INTEGER NOT NULL,
    "scoreC" INTEGER NOT NULL,
    "primaryFactor" "Factor" NOT NULL,
    "secondaryFactor" "Factor" NOT NULL,
    "tied" BOOLEAN NOT NULL DEFAULT false,
    "questionnaireVersion" INTEGER NOT NULL,
    "calculatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_result_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_slug_key" ON "tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "user_tenantId_email_key" ON "user"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_type_code_key" ON "assessment_type"("code");

-- CreateIndex
CREATE UNIQUE INDEX "questionnaire_assessmentTypeId_version_key" ON "questionnaire"("assessmentTypeId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "question_group_questionnaireId_position_key" ON "question_group"("questionnaireId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "question_option_groupId_factor_key" ON "question_option"("groupId", "factor");

-- CreateIndex
CREATE UNIQUE INDEX "invitation_tokenHash_key" ON "invitation"("tokenHash");

-- CreateIndex
CREATE INDEX "invitation_tenantId_status_idx" ON "invitation"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "submission_invitationId_key" ON "submission"("invitationId");

-- CreateIndex
CREATE UNIQUE INDEX "submission_idempotencyKey_key" ON "submission"("idempotencyKey");

-- CreateIndex
CREATE INDEX "submission_tenantId_submittedAt_idx" ON "submission"("tenantId", "submittedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "candidate_submissionId_key" ON "candidate"("submissionId");

-- CreateIndex
CREATE INDEX "candidate_tenantId_jobTitle_idx" ON "candidate"("tenantId", "jobTitle");

-- CreateIndex
CREATE INDEX "candidate_tenantId_department_idx" ON "candidate"("tenantId", "department");

-- CreateIndex
CREATE UNIQUE INDEX "answer_submissionId_optionId_key" ON "answer"("submissionId", "optionId");

-- CreateIndex
CREATE UNIQUE INDEX "answer_submissionId_groupId_rank_key" ON "answer"("submissionId", "groupId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "profile_result_submissionId_key" ON "profile_result"("submissionId");

-- CreateIndex
CREATE INDEX "profile_result_primaryFactor_idx" ON "profile_result"("primaryFactor");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire" ADD CONSTRAINT "questionnaire_assessmentTypeId_fkey" FOREIGN KEY ("assessmentTypeId") REFERENCES "assessment_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_group" ADD CONSTRAINT "question_group_questionnaireId_fkey" FOREIGN KEY ("questionnaireId") REFERENCES "questionnaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_option" ADD CONSTRAINT "question_option_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "question_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_questionnaireId_fkey" FOREIGN KEY ("questionnaireId") REFERENCES "questionnaire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission" ADD CONSTRAINT "submission_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission" ADD CONSTRAINT "submission_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "invitation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate" ADD CONSTRAINT "candidate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate" ADD CONSTRAINT "candidate_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer" ADD CONSTRAINT "answer_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer" ADD CONSTRAINT "answer_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "question_group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "answer" ADD CONSTRAINT "answer_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "question_option"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_result" ADD CONSTRAINT "profile_result_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Invariantes que o Prisma não expressa
ALTER TABLE "answer" ADD CONSTRAINT "answer_rank_range" CHECK ("rank" BETWEEN 1 AND 4);
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "candidate_name_trgm" ON "candidate" USING gin ("name" gin_trgm_ops);
