-- Drop the old orders columns that reference MomoProvider BEFORE the enum is swapped,
-- so nothing depends on the old enum type when we try to drop it.
ALTER TABLE "orders" DROP COLUMN "momoPhone",
DROP COLUMN "momoProvider";

-- AlterEnum
BEGIN;
CREATE TYPE "MomoProvider_new" AS ENUM ('mtn', 'telecel', 'airteltigo');
ALTER TABLE "users" ALTER COLUMN "momoProvider" TYPE "MomoProvider_new" USING ("momoProvider"::text::"MomoProvider_new");
ALTER TYPE "MomoProvider" RENAME TO "MomoProvider_old";
ALTER TYPE "MomoProvider_new" RENAME TO "MomoProvider";
DROP TYPE "MomoProvider_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM ('pending', 'payment_submitted', 'payment_rejected', 'paid', 'delivered', 'cancelled');
ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "OrderStatus_old";
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'pending';
COMMIT;

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_orderId_fkey";

-- AlterTable: add the new manual-momo-reconciliation columns to orders
ALTER TABLE "orders"
ADD COLUMN     "buyerMomoPhone" TEXT,
ADD COLUMN     "paidConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "paymentRejectedNote" TEXT,
ADD COLUMN     "paymentSubmittedAt" TIMESTAMP(3),
ADD COLUMN     "sellerMomoAccountName" TEXT NOT NULL,
ADD COLUMN     "sellerMomoPhone" TEXT NOT NULL,
ADD COLUMN     "sellerMomoProvider" "MomoProvider" NOT NULL,
ADD COLUMN     "transactionId" TEXT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "paystackRecipientCode",
ADD COLUMN     "momoAccountName" TEXT;

-- DropTable
DROP TABLE "transactions";

-- DropEnum
DROP TYPE "TransactionType";
