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

  // Revisión 4: validar rating y comment antes de persistir
  const rating = Number(data?.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw { status: 400, message: "La calificación debe ser un entero entre 1 y 5" };
  }

  if (data?.comment != null && typeof data.comment !== "string") {
    throw { status: 400, message: "El comentario es inválido" };
  }

  if (data?.comment != null && data.comment.length > 2000) {
    throw { status: 400, message: "El comentario no puede superar 2000 caracteres" };
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

  // 3. Verificar pedido DELIVERED con este producto
  const deliveredOrder = await prisma.orders.findFirst({
    where: {
      fk_user: buyerId,
      order_status: "DELIVERED",
      status: true,
      order_items: {
        some: { fk_product: id, status: true }
      }
    },
    select: { id_order: true }
  });

  if (!deliveredOrder) {
    throw { status: 403, message: "Solo podés reseñar productos que hayas recibido" };
  }

  // 4. Crear la reseña — Revisión 3: manejamos P2002 para la race condition
  try {
    const review = await prisma.productReviews.create({
      data: {
        fk_user: buyerId,
        fk_product: id,
        rating,
        comment: data.comment?.trim() || null,
        approved: true,
        status: true
      },
      select: {
        id_product_review: true,
        rating: true,
        comment: true,
        approved: true,
        created_at: true,
        user: { select: { name: true } }
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
  } catch (err) {
    // Revisión 3: P2002 = violación de constraint único → reseña duplicada
    if (err?.code === "P2002") {
      throw { status: 400, message: "Ya dejaste una reseña para este producto" };
    }
    throw err;
  }
};