//delivery-review.service.js
import { prisma } from '../../../lib/prisma.js';

// Crear reseña de delivery
export const createDeliveryReviewService = async (data, id_user) => {
  const { fk_order, fk_delivery, rating, comment } = data;

  // Verificar que el pedido existe
  const order = await prisma.orders.findUnique({
    where: { id_order: fk_order }
  });

  if (!order) {
    throw { status: 404, message: "Pedido no encontrado" };
  }

  // Verificar que el delivery existe
  const delivery = await prisma.deliveries.findUnique({
    where: { id_delivery: fk_delivery }
  });

  if (!delivery) {
    throw { status: 404, message: "Delivery no encontrado" };
  }

  // Verificar que no hay una reseña previa para este pedido
  const existingReview = await prisma.deliveryReviews.findUnique({
    where: { fk_order }
  });

  if (existingReview) {
    throw { status: 409, message: "Ya existe una reseña para este pedido" };
  }

  // Verificar que la asignación fue ACCEPTED o DELIVERED
  const assignment = await prisma.deliveryAssignments.findFirst({
    where: {
      fk_order,
      fk_delivery,
      assignment_status: { in: ["ACCEPTED", "DELIVERED"] }
    }
  });

  if (!assignment) {
    throw { status: 403, message: "El delivery no aceptó este pedido" };
  }

  // Verificar que el usuario autenticado es el dueño del pedido o el delivery
  if (order.fk_user !== id_user && fk_delivery !== id_user) {
    throw { status: 403, message: "No tienes permiso para crear esta reseña" };
  }

  // Crear la reseña
  const review = await prisma.deliveryReviews.create({
    data: {
      fk_order,
      fk_user: order.fk_user,
      fk_delivery,
      rating,
      comment: comment || null
    },
    include: {
      user: {
        select: { id_user: true, name: true }
      },
      delivery: {
        select: { id_delivery: true }
      }
    }
  });

  return review;
};

// Obtener reseña de delivery por ID
export const getDeliveryReviewByIdService = async (id_delivery_review) => {
  const review = await prisma.deliveryReviews.findUnique({
    where: { id_delivery_review },
    include: {
      user: {
        select: { id_user: true, name: true, avatar_url: true }
      },
      delivery: {
        select: { id_delivery: true }
      },
      order: {
        select: { id_order: true }
      }
    }
  });

  if (!review) {
    throw { status: 404, message: "Reseña no encontrada" };
  }

  return review;
};

// Obtener reseñas de un delivery
export const getDeliveryReviewsService = async (id_delivery) => {
  const delivery = await prisma.deliveries.findUnique({
    where: { id_delivery }
  });

  if (!delivery) {
    throw { status: 404, message: "Delivery no encontrado" };
  }

  const reviews = await prisma.deliveryReviews.findMany({
    where: { fk_delivery: id_delivery },
    include: {
      user: {
        select: { id_user: true, name: true, avatar_url: true }
      }
    },
    orderBy: { created_at: 'desc' }
  });

  // Calcular promedio de rating
  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(2)
    : 0;

  return {
    delivery_id: id_delivery,
    total_reviews: reviews.length,
    average_rating: Number.parseFloat(averageRating),
    reviews
  };
};

// Obtener reseña de un pedido
export const getOrderDeliveryReviewService = async (id_order) => {
  const order = await prisma.orders.findUnique({
    where: { id_order }
  });

  if (!order) {
    throw { status: 404, message: "Pedido no encontrado" };
  }

  const review = await prisma.deliveryReviews.findUnique({
    where: { fk_order: id_order },
    include: {
      user: {
        select: { id_user: true, name: true }
      },
      delivery: {
        select: { id_delivery: true }
      }
    }
  });

  if (!review) {
    throw { status: 404, message: "No hay reseña para este pedido" };
  }

  return review;
};

// Actualizar reseña de delivery
export const updateDeliveryReviewService = async (id_delivery_review, data, id_user) => {
  const { rating, comment } = data;

  // Verificar que la reseña existe
  const review = await prisma.deliveryReviews.findUnique({
    where: { id_delivery_review }
  });

  if (!review) {
    throw { status: 404, message: "Reseña no encontrada" };
  }

  // Validar que el usuario autenticado es el dueño de la reseña
  if (review.fk_user !== id_user) {
    throw { status: 403, message: "No tienes permiso para actualizar esta reseña" };
  }

  // Construir datos a actualizar
  const dataToUpdate = {};
  if (rating !== undefined) dataToUpdate.rating = rating;
  if (comment !== undefined) dataToUpdate.comment = comment;

  // Actualizar reseña
  const updated = await prisma.deliveryReviews.update({
    where: { id_delivery_review },
    data: dataToUpdate,
    include: {
      user: {
        select: { id_user: true, name: true }
      },
      delivery: {
        select: { id_delivery: true }
      }
    }
  });

  return updated;
};

// Eliminar reseña (borrado lógico)
export const deleteDeliveryReviewService = async (id_delivery_review, id_user) => {
  const review = await prisma.deliveryReviews.findUnique({
    where: { id_delivery_review }
  });

  if (!review) {
    throw { status: 404, message: "Reseña no encontrada" };
  }

  // Validar que el usuario autenticado es el dueño de la reseña
  if (review.fk_user !== id_user) {
    throw { status: 403, message: "No tienes permiso para eliminar esta reseña" };
  }

  // Borrado lógico
  await prisma.deliveryReviews.update({
    where: { id_delivery_review },
    data: { status: false }
  });

  return { message: "Reseña eliminada" };
};

// Obtener estadísticas de reseñas del delivery
export const getDeliveryReviewStatsService = async (id_delivery) => {
  const delivery = await prisma.deliveries.findUnique({
    where: { id_delivery }
  });

  if (!delivery) {
    throw { status: 404, message: "Delivery no encontrado" };
  }

  const reviews = await prisma.deliveryReviews.findMany({
    where: { fk_delivery: id_delivery }
  });

  if (reviews.length === 0) {
    return {
      delivery_id: id_delivery,
      total_reviews: 0,
      average_rating: 0,
      rating_distribution: {
        one_star: 0,
        two_stars: 0,
        three_stars: 0,
        four_stars: 0,
        five_stars: 0
      }
    };
  }

  const ratingDistribution = {
    one_star: reviews.filter(r => r.rating === 1).length,
    two_stars: reviews.filter(r => r.rating === 2).length,
    three_stars: reviews.filter(r => r.rating === 3).length,
    four_stars: reviews.filter(r => r.rating === 4).length,
    five_stars: reviews.filter(r => r.rating === 5).length
  };

  const averageRating = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(2);

  return {
    delivery_id: id_delivery,
    total_reviews: reviews.length,
    average_rating: Number.parseFloat(averageRating),
    rating_distribution: ratingDistribution
  };
};