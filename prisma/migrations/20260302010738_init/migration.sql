-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('AVAILABLE', 'ON_THE_WAY', 'ASSIGNED', 'DELIVERED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CUSTOMER', 'SELLER', 'DELIVERY');

-- CreateTable
CREATE TABLE "Users" (
    "id_user" SERIAL NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("id_user")
);

-- CreateTable
CREATE TABLE "Notifications" (
    "id_notification" SERIAL NOT NULL,
    "fk_user" INTEGER NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "message" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Notifications_pkey" PRIMARY KEY ("id_notification")
);

-- CreateTable
CREATE TABLE "Stores" (
    "id_store" SERIAL NOT NULL,
    "fk_store_category" INTEGER NOT NULL,
    "fk_user" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "description" TEXT,
    "logo" VARCHAR(500),
    "website_url" VARCHAR(500),
    "instagram_url" VARCHAR(500),
    "tiktok_url" VARCHAR(500),
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Stores_pkey" PRIMARY KEY ("id_store")
);

-- CreateTable
CREATE TABLE "StoreCategories" (
    "id_store_category" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "StoreCategories_pkey" PRIMARY KEY ("id_store_category")
);

-- CreateTable
CREATE TABLE "ShippingZones" (
    "id_shipping_zone" SERIAL NOT NULL,
    "fk_store" INTEGER NOT NULL,
    "region" VARCHAR(50) NOT NULL,
    "postal_code" VARCHAR(20),
    "base_price" DECIMAL(10,2),
    "distance_price" DECIMAL(10,2),
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ShippingZones_pkey" PRIMARY KEY ("id_shipping_zone")
);

-- CreateTable
CREATE TABLE "Addresses" (
    "id_address" SERIAL NOT NULL,
    "fk_user" INTEGER NOT NULL,
    "fk_store" INTEGER,
    "address" TEXT,
    "city" VARCHAR(100),
    "region" VARCHAR(100),
    "postal_code" VARCHAR(20),
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Addresses_pkey" PRIMARY KEY ("id_address")
);

-- CreateTable
CREATE TABLE "Products" (
    "id_product" SERIAL NOT NULL,
    "fk_product_category" INTEGER NOT NULL,
    "fk_store" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2),
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "quantity" INTEGER,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Products_pkey" PRIMARY KEY ("id_product")
);

-- CreateTable
CREATE TABLE "ProductCategories" (
    "id_product_category" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ProductCategories_pkey" PRIMARY KEY ("id_product_category")
);

-- CreateTable
CREATE TABLE "ProductTags" (
    "id_product_tag" SERIAL NOT NULL,
    "name" VARCHAR(20) NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ProductTags_pkey" PRIMARY KEY ("id_product_tag")
);

-- CreateTable
CREATE TABLE "ProductTagRelations" (
    "id_product_tag_relation" SERIAL NOT NULL,
    "fk_product" INTEGER NOT NULL,
    "fk_product_tag" INTEGER NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ProductTagRelations_pkey" PRIMARY KEY ("id_product_tag_relation")
);

-- CreateTable
CREATE TABLE "Collections" (
    "id_collection" SERIAL NOT NULL,
    "fk_store" INTEGER NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Collections_pkey" PRIMARY KEY ("id_collection")
);

-- CreateTable
CREATE TABLE "ProductCollections" (
    "id_product_collection" SERIAL NOT NULL,
    "fk_product" INTEGER NOT NULL,
    "fk_collection" INTEGER NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ProductCollections_pkey" PRIMARY KEY ("id_product_collection")
);

-- CreateTable
CREATE TABLE "ProductReviews" (
    "id_product_review" SERIAL NOT NULL,
    "fk_user" INTEGER NOT NULL,
    "fk_product" INTEGER NOT NULL,
    "comment" TEXT,
    "rating" SMALLINT NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT true,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ProductReviews_pkey" PRIMARY KEY ("id_product_review")
);

-- CreateTable
CREATE TABLE "Wishlists" (
    "id_wishlist" SERIAL NOT NULL,
    "fk_user" INTEGER NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Wishlists_pkey" PRIMARY KEY ("id_wishlist")
);

-- CreateTable
CREATE TABLE "WishlistItems" (
    "id_wishlist_item" SERIAL NOT NULL,
    "fk_wishlist" INTEGER NOT NULL,
    "fk_product" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "WishlistItems_pkey" PRIMARY KEY ("id_wishlist_item")
);

-- CreateTable
CREATE TABLE "Deliveries" (
    "id_delivery" SERIAL NOT NULL,
    "fk_store" INTEGER NOT NULL,
    "fk_user" INTEGER NOT NULL,
    "delivery_status" "DeliveryStatus" NOT NULL DEFAULT 'AVAILABLE',
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Deliveries_pkey" PRIMARY KEY ("id_delivery")
);

-- CreateTable
CREATE TABLE "DeliveryAssignments" (
    "id_delivery_assignment" SERIAL NOT NULL,
    "fk_order" INTEGER NOT NULL,
    "fk_delivery" INTEGER NOT NULL,
    "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DeliveryAssignments_pkey" PRIMARY KEY ("id_delivery_assignment")
);

-- CreateTable
CREATE TABLE "Orders" (
    "id_order" SERIAL NOT NULL,
    "fk_user" INTEGER NOT NULL,
    "fk_address" INTEGER NOT NULL,
    "fk_wishlist" INTEGER NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "order_status" "OrderStatus" NOT NULL DEFAULT 'PROCESSING',
    "notes" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Orders_pkey" PRIMARY KEY ("id_order")
);

-- CreateTable
CREATE TABLE "OrderItems" (
    "id_order_item" SERIAL NOT NULL,
    "fk_order" INTEGER NOT NULL,
    "fk_product" INTEGER NOT NULL,
    "quantity" SMALLINT NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "OrderItems_pkey" PRIMARY KEY ("id_order_item")
);

-- CreateIndex
CREATE UNIQUE INDEX "Users_email_key" ON "Users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Stores_fk_store_category_key" ON "Stores"("fk_store_category");

-- CreateIndex
CREATE UNIQUE INDEX "Stores_fk_user_key" ON "Stores"("fk_user");

-- CreateIndex
CREATE UNIQUE INDEX "Stores_email_key" ON "Stores"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Deliveries_fk_user_key" ON "Deliveries"("fk_user");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryAssignments_fk_order_key" ON "DeliveryAssignments"("fk_order");

-- CreateIndex
CREATE UNIQUE INDEX "Orders_fk_wishlist_key" ON "Orders"("fk_wishlist");

-- AddForeignKey
ALTER TABLE "Notifications" ADD CONSTRAINT "Notifications_fk_user_fkey" FOREIGN KEY ("fk_user") REFERENCES "Users"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stores" ADD CONSTRAINT "Stores_fk_user_fkey" FOREIGN KEY ("fk_user") REFERENCES "Users"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stores" ADD CONSTRAINT "Stores_fk_store_category_fkey" FOREIGN KEY ("fk_store_category") REFERENCES "StoreCategories"("id_store_category") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingZones" ADD CONSTRAINT "ShippingZones_fk_store_fkey" FOREIGN KEY ("fk_store") REFERENCES "Stores"("id_store") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Addresses" ADD CONSTRAINT "Addresses_fk_user_fkey" FOREIGN KEY ("fk_user") REFERENCES "Users"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Addresses" ADD CONSTRAINT "Addresses_fk_store_fkey" FOREIGN KEY ("fk_store") REFERENCES "Stores"("id_store") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Products" ADD CONSTRAINT "Products_fk_store_fkey" FOREIGN KEY ("fk_store") REFERENCES "Stores"("id_store") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Products" ADD CONSTRAINT "Products_fk_product_category_fkey" FOREIGN KEY ("fk_product_category") REFERENCES "ProductCategories"("id_product_category") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTagRelations" ADD CONSTRAINT "ProductTagRelations_fk_product_fkey" FOREIGN KEY ("fk_product") REFERENCES "Products"("id_product") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTagRelations" ADD CONSTRAINT "ProductTagRelations_fk_product_tag_fkey" FOREIGN KEY ("fk_product_tag") REFERENCES "ProductTags"("id_product_tag") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collections" ADD CONSTRAINT "Collections_fk_store_fkey" FOREIGN KEY ("fk_store") REFERENCES "Stores"("id_store") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCollections" ADD CONSTRAINT "ProductCollections_fk_product_fkey" FOREIGN KEY ("fk_product") REFERENCES "Products"("id_product") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCollections" ADD CONSTRAINT "ProductCollections_fk_collection_fkey" FOREIGN KEY ("fk_collection") REFERENCES "Collections"("id_collection") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReviews" ADD CONSTRAINT "ProductReviews_fk_user_fkey" FOREIGN KEY ("fk_user") REFERENCES "Users"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReviews" ADD CONSTRAINT "ProductReviews_fk_product_fkey" FOREIGN KEY ("fk_product") REFERENCES "Products"("id_product") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wishlists" ADD CONSTRAINT "Wishlists_fk_user_fkey" FOREIGN KEY ("fk_user") REFERENCES "Users"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItems" ADD CONSTRAINT "WishlistItems_fk_wishlist_fkey" FOREIGN KEY ("fk_wishlist") REFERENCES "Wishlists"("id_wishlist") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItems" ADD CONSTRAINT "WishlistItems_fk_product_fkey" FOREIGN KEY ("fk_product") REFERENCES "Products"("id_product") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deliveries" ADD CONSTRAINT "Deliveries_fk_store_fkey" FOREIGN KEY ("fk_store") REFERENCES "Stores"("id_store") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deliveries" ADD CONSTRAINT "Deliveries_fk_user_fkey" FOREIGN KEY ("fk_user") REFERENCES "Users"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryAssignments" ADD CONSTRAINT "DeliveryAssignments_fk_order_fkey" FOREIGN KEY ("fk_order") REFERENCES "Orders"("id_order") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryAssignments" ADD CONSTRAINT "DeliveryAssignments_fk_delivery_fkey" FOREIGN KEY ("fk_delivery") REFERENCES "Deliveries"("id_delivery") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orders" ADD CONSTRAINT "Orders_fk_wishlist_fkey" FOREIGN KEY ("fk_wishlist") REFERENCES "Wishlists"("id_wishlist") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orders" ADD CONSTRAINT "Orders_fk_user_fkey" FOREIGN KEY ("fk_user") REFERENCES "Users"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orders" ADD CONSTRAINT "Orders_fk_address_fkey" FOREIGN KEY ("fk_address") REFERENCES "Addresses"("id_address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItems" ADD CONSTRAINT "OrderItems_fk_order_fkey" FOREIGN KEY ("fk_order") REFERENCES "Orders"("id_order") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItems" ADD CONSTRAINT "OrderItems_fk_product_fkey" FOREIGN KEY ("fk_product") REFERENCES "Products"("id_product") ON DELETE RESTRICT ON UPDATE CASCADE;
