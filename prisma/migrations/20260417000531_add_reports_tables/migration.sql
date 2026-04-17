-- CreateEnum
CREATE TYPE "ReviewReportReason" AS ENUM ('SPAM', 'OFFENSIVE', 'FAKE', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProductReportReason" AS ENUM ('DEFECTIVE', 'LATE_DELIVERY', 'CUSTOMER_SERVICE', 'WRONG_ITEM', 'MISSING_ITEM', 'OTHER');

-- CreateTable
CREATE TABLE "ReviewReports" (
    "id_review_report" SERIAL NOT NULL,
    "fk_product_review" INTEGER NOT NULL,
    "fk_reporter" INTEGER NOT NULL,
    "reason" "ReviewReportReason" NOT NULL,
    "description" TEXT,
    "report_status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "resolved_by" INTEGER,
    "resolved_at" TIMESTAMPTZ,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ReviewReports_pkey" PRIMARY KEY ("id_review_report")
);

-- CreateTable
CREATE TABLE "ProductReports" (
    "id_product_report" SERIAL NOT NULL,
    "fk_product" INTEGER NOT NULL,
    "fk_reporter" INTEGER NOT NULL,
    "fk_order" INTEGER,
    "reason" "ProductReportReason" NOT NULL,
    "description" TEXT,
    "report_status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "resolved_by" INTEGER,
    "resolved_at" TIMESTAMPTZ,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ProductReports_pkey" PRIMARY KEY ("id_product_report")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReviewReports_fk_product_review_fk_reporter_key" ON "ReviewReports"("fk_product_review", "fk_reporter");

-- AddForeignKey
ALTER TABLE "ReviewReports" ADD CONSTRAINT "ReviewReports_fk_product_review_fkey" FOREIGN KEY ("fk_product_review") REFERENCES "ProductReviews"("id_product_review") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewReports" ADD CONSTRAINT "ReviewReports_fk_reporter_fkey" FOREIGN KEY ("fk_reporter") REFERENCES "Users"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewReports" ADD CONSTRAINT "ReviewReports_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "Users"("id_user") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReports" ADD CONSTRAINT "ProductReports_fk_product_fkey" FOREIGN KEY ("fk_product") REFERENCES "Products"("id_product") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReports" ADD CONSTRAINT "ProductReports_fk_reporter_fkey" FOREIGN KEY ("fk_reporter") REFERENCES "Users"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReports" ADD CONSTRAINT "ProductReports_fk_order_fkey" FOREIGN KEY ("fk_order") REFERENCES "Orders"("id_order") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReports" ADD CONSTRAINT "ProductReports_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "Users"("id_user") ON DELETE SET NULL ON UPDATE CASCADE;
