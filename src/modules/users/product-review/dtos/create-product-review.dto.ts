// src/modules/users/product-reviews/product-review.service.js
import { prisma } from "../../../lib/prisma.js";

export const createProductReviewService = async (productId, customerId, data) => {
  const id = Number(productId);
  if (!Number.isInteger(id) || id <= 0) {
    throw { status: 400, message: "ID de producto inválido" };
  }

  const buyerId = Number(customerId);
  if (!Number.isInteger(buyerId) || buyerId <= 0) {
    throw { status: 400, message: "ID de comprador inválido" };
  }

  // 1. Verificar que el producto exista y esté activo
  const product = await prisma.products.findUnique({
    where: { id_product: id },
    select: { id_product: true, status: true }
  });

  if (!product || !product.status) {
    throw { status: 404, message: "Producto no encontrado" };
  }

  // 2. Verificar que el comprador exista y sea CUSTOMER
  const buyer = await prisma.users.findUnique({
    where: { id_user: buyerId },
    select: { id_user: true, role: true, status: true }
  });

  if (!buyer || !buyer.status) {
    throw { status: 404, message: "Usuario no encontrado" };
  }

  if (buyer.role !== "CUSTOMER") {
    throw { status: 403, message: "Solo los compradores pueden dejar reseñas" };
  }

  // 3. Verificar que tenga al menos un pedido DELIVERED con este producto
  const deliveredOrder = await prisma.orders.findFirst({
    where: {
      fk_user: buyerId,
      order_status: "DELIVERED",
      status: true,
      order_items: {
        some: {
          fk_product: id,
          status: true
        }
      }
    },
    select: { id_order: true }
  });

  if (!deliveredOrder) {
    throw {
      status: 403,
      message: "Solo podés reseñar productos que hayas recibido"
    };
  }

  // 4. Verificar que no haya reseñado ya este producto
  const existingReview = await prisma.productReviews.findFirst({
    where: {
      fk_user: buyerId,
      fk_product: id,
      status: true
    },
    select: { id_product_review: true }
  });

  if (existingReview) {
    throw { status: 400, message: "Ya dejaste una reseña para este producto" };
  }

  // 5. Crear la reseña — isVerified = true porque pasó la validación del paso 3
  const review = await prisma.productReviews.create({
    data: {
      fk_user: buyerId,
      fk_product: id,
      rating: data.rating,
      comment: data.comment ?? null,
      approved: true,
      status: true
    },
    select: {
      id_product_review: true,
      rating: true,
      comment: true,
      approved: true,
      created_at: true,
      user: {
        select: { name: true }
      }
    }
  });

  return {
    id: review.id_product_review,
    customerName: review.user.name,
    rating: review.rating,
    comment: review.comment,
    date: review.created_at,
    isVerified: review.approved
  };
};