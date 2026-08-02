-- CreateEnum
CREATE TYPE "DisputeResolution" AS ENUM ('uphold_payment', 'uphold_rejection');

-- CreateEnum
CREATE TYPE "CoopMemberRole" AS ENUM ('LEADER', 'MEMBER');

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'disputed';

-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "coopId" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "disputeRaisedAt" TIMESTAMP(3),
ADD COLUMN     "disputeReason" TEXT,
ADD COLUMN     "disputeResolution" "DisputeResolution",
ADD COLUMN     "disputeResolvedAt" TIMESTAMP(3),
ADD COLUMN     "disputeResolvedNote" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isSuspended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ratingCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ratings" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "raterId" TEXT NOT NULL,
    "ratedId" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coop_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "joinCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coop_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coop_members" (
    "id" TEXT NOT NULL,
    "coopId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CoopMemberRole" NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coop_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ratings_ratedId_idx" ON "ratings"("ratedId");

-- CreateIndex
CREATE UNIQUE INDEX "ratings_orderId_raterId_key" ON "ratings"("orderId", "raterId");

-- CreateIndex
CREATE UNIQUE INDEX "coop_groups_joinCode_key" ON "coop_groups"("joinCode");

-- CreateIndex
CREATE UNIQUE INDEX "coop_members_userId_key" ON "coop_members"("userId");

-- CreateIndex
CREATE INDEX "coop_members_coopId_idx" ON "coop_members"("coopId");

-- CreateIndex
CREATE INDEX "listings_coopId_idx" ON "listings"("coopId");

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_coopId_fkey" FOREIGN KEY ("coopId") REFERENCES "coop_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_raterId_fkey" FOREIGN KEY ("raterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_ratedId_fkey" FOREIGN KEY ("ratedId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coop_members" ADD CONSTRAINT "coop_members_coopId_fkey" FOREIGN KEY ("coopId") REFERENCES "coop_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coop_members" ADD CONSTRAINT "coop_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
