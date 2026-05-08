-- CreateTable
CREATE TABLE "DeliveryReviews" (
    "id_delivery_review" SERIAL NOT NULL,
    "fk_order" INTEGER NOT NULL,
    "fk_user" INTEGER NOT NULL,
    "fk_delivery" INTEGER NOT NULL,
    "rating" SMALLINT NOT NULL,
    "comment" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "DeliveryReviews_pkey" PRIMARY KEY ("id_delivery_review")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryReviews_fk_order_key" ON "DeliveryReviews"("fk_order");

-- AddForeignKey
ALTER TABLE "DeliveryReviews" ADD CONSTRAINT "DeliveryReviews_fk_order_fkey" FOREIGN KEY ("fk_order") REFERENCES "Orders"("id_order") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryReviews" ADD CONSTRAINT "DeliveryReviews_fk_user_fkey" FOREIGN KEY ("fk_user") REFERENCES "Users"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryReviews" ADD CONSTRAINT "DeliveryReviews_fk_delivery_fkey" FOREIGN KEY ("fk_delivery") REFERENCES "Deliveries"("id_delivery") ON DELETE RESTRICT ON UPDATE CASCADE;
