-- CreateEnum
CREATE TYPE "Role" AS ENUM ('FARMER', 'BUYER', 'EXTENSION', 'ADMIN');

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('en', 'tw');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "name" TEXT,
    "locale" "Locale" NOT NULL DEFAULT 'en',
    "trustScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");
