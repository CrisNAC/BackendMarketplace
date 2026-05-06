import { prisma } from "../../../lib/prisma.js";
import { ConflictError, NotFoundError, ValidationError } from "../../../lib/errors.js";
import { parsePositiveInteger } from "../../../lib/validators.js";
import { getAuthorizedStoreOwnerService } from "../commerces/store.service.js";

export const searchDeliveryCandidatesService = async (query) => {
  if (!query) return [];

  const candidates = await prisma.users.findMany({
    where: {
      role: 'DELIVERY',
      status: true,
      OR: [
        { email: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query, mode: 'insensitive' } }
      ],
      delivery: null
    },
    select: {
      id_user: true,
      name: true,
      email: true,
      phone: true
    }
  });

  return candidates;
};

export const createDeliveryService = async (authenticatedUserId, storeIdStr, deliveryUserIdStr) => {
  const store = await getAuthorizedStoreOwnerService(authenticatedUserId, storeIdStr);
  const deliveryUserId = Number(deliveryUserIdStr);
  
  if (!Number.isInteger(deliveryUserId) || deliveryUserId <= 0) {
    throw new ValidationError("El ID del candidato a delivery debe ser un número entero positivo");
  }

  const user = await prisma.users.findFirst({
    where: { id_user: deliveryUserId, role: 'DELIVERY', status: true }
  });

  if (!user) {
    throw new NotFoundError("Candidato a delivery no encontrado o no válido");
  }

  try {
    const delivery = await prisma.deliveries.create({
      data: {
        fk_store: store.id_store,
        fk_user: deliveryUserId,
        delivery_status: 'INACTIVE'
      }
    });

    return delivery;
  } catch (error) {
    if (error.code === 'P2002') {
      const existing = await prisma.deliveries.findUnique({
        where: { fk_user: deliveryUserId }
      });
      
      if (existing && existing.fk_store === store.id_store) {
        throw new ConflictError("El delivery ya está vinculado a este comercio");
      }
      throw new ConflictError("El delivery ya está vinculado a un comercio");
    }
    throw error;
  }
};

export const getStoreDeliveryReviewsService = async (
  authenticatedUserId,
  storeIdStr,
  deliveryIdStr,
  query
) => {
  const store = await getAuthorizedStoreOwnerService(authenticatedUserId, storeIdStr);
  const deliveryId = parsePositiveInteger(deliveryIdStr, "ID de delivery");

  const delivery = await prisma.deliveries.findUnique({
    where: { id_delivery: deliveryId },
    select: { id_delivery: true, fk_store: true }
  });

  if (!delivery || delivery.fk_store !== store.id_store) {
    throw new NotFoundError("Delivery no encontrado para este comercio");
  }

  const searchValue = query?.search?.toString().trim();
  const searchOrderId = searchValue ? parsePositiveInteger(searchValue, "ID de pedido") : null;

  const minRatingValue = query?.minRating ?? query?.min_rating;
  const maxRatingValue = query?.maxRating ?? query?.max_rating;

  const minRating = minRatingValue !== undefined
    ? parsePositiveInteger(minRatingValue, "minRating")
    : null;
  const maxRating = maxRatingValue !== undefined
    ? parsePositiveInteger(maxRatingValue, "maxRating")
    : null;

  if (minRating !== null && (minRating < 1 || minRating > 5)) {
    throw new ValidationError("minRating debe estar entre 1 y 5");
  }

  if (maxRating !== null && (maxRating < 1 || maxRating > 5)) {
    throw new ValidationError("maxRating debe estar entre 1 y 5");
  }

  if (minRating !== null && maxRating !== null && minRating > maxRating) {
    throw new ValidationError("minRating no puede ser mayor que maxRating");
  }

  const ratingFilter =
    minRating !== null || maxRating !== null
      ? {
        rating: {
          ...(minRating !== null && { gte: minRating }),
          ...(maxRating !== null && { lte: maxRating })
        }
      }
      : {};

  const reviews = await prisma.deliveryReviews.findMany({
    where: {
      fk_delivery: deliveryId,
      status: true,
      ...(searchOrderId ? { fk_order: searchOrderId } : {}),
      ...ratingFilter
    },
    orderBy: { created_at: "desc" },
    select: {
      id_delivery_review: true,
      fk_order: true,
      rating: true,
      comment: true,
      created_at: true,
      user: { select: { name: true } }
    }
  });

  return {
    total: reviews.length,
    reviews: reviews.map((review) => ({
      id: review.id_delivery_review,
      orderId: review.fk_order,
      customerName: review.user?.name ?? "Cliente",
      rating: review.rating,
      comment: review.comment,
      createdAt: review.created_at
    }))
  };
};