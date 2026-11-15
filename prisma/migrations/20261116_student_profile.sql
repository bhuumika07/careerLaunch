-- Migration: 20261116_student_profile.sql
-- Additive migration for StudentProfile model (Chunk 4.1)

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProfileFieldSource') THEN
        CREATE TYPE "ProfileFieldSource" AS ENUM ('STUDENT', 'RESUME');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "StudentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "college" TEXT,
    "degree" TEXT,
    "branch" TEXT,
    "currentYear" INTEGER,
    "graduationYear" INTEGER,
    "cgpa" DOUBLE PRECISION,
    "cgpaScale" DOUBLE PRECISION DEFAULT 10.0,
    "backlogs" INTEGER DEFAULT 0,
    "fieldMetadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StudentProfile_userId_key" ON "StudentProfile"("userId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'StudentProfile_userId_fkey'
    ) THEN
        ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
