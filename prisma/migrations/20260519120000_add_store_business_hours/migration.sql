-- CreateTable
CREATE TABLE "StoreBusinessHours" (
    "id_store_business_hour" SERIAL NOT NULL,
    "fk_store" INTEGER NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "open_time" VARCHAR(5),
    "close_time" VARCHAR(5),
    "is_closed" BOOLEAN NOT NULL DEFAULT true,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "StoreBusinessHours_pkey" PRIMARY KEY ("id_store_business_hour")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoreBusinessHours_fk_store_day_of_week_key" ON "StoreBusinessHours"("fk_store", "day_of_week");

-- AddForeignKey
ALTER TABLE "StoreBusinessHours" ADD CONSTRAINT "StoreBusinessHours_fk_store_fkey" FOREIGN KEY ("fk_store") REFERENCES "Stores"("id_store") ON DELETE RESTRICT ON UPDATE CASCADE;
