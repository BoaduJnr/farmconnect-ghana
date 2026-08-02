-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('ACTIVE', 'PENDING', 'SOLD', 'REMOVED');

-- CreateTable
CREATE TABLE "listings" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "cropType" TEXT NOT NULL,
    "quantityKg" INTEGER NOT NULL,
    "pricePerKg" DECIMAL(10,2) NOT NULL,
    "harvestDate" TIMESTAMP(3),
    "availableFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "regionLabel" TEXT NOT NULL,
    "status" "ListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "listings_farmerId_idx" ON "listings"("farmerId");

-- CreateIndex
CREATE INDEX "listings_cropType_idx" ON "listings"("cropType");

-- CreateIndex
CREATE INDEX "listings_status_idx" ON "listings"("status");

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
