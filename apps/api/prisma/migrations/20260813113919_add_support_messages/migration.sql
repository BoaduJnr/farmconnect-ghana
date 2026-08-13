-- CreateEnum
CREATE TYPE "SupportSender" AS ENUM ('USER', 'ADMIN');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'SUPPORT';

-- CreateTable
CREATE TABLE "support_messages" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sender" "SupportSender" NOT NULL,
    "adminId" TEXT,
    "content" TEXT NOT NULL,
    "orderId" TEXT,
    "readByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "readByUser" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "support_messages_userId_createdAt_idx" ON "support_messages"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
