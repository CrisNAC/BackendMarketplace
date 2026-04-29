//delivery-review.controller.js
import { ZodError } from 'zod';
import {
  createDeliveryReviewSchema,
  updateDeliveryReviewSchema
} from './delivery-review.validation.js';
import {
  createDeliveryReviewService,
  getDeliveryReviewByIdService,
  getDeliveryReviewsService,
  getOrderDeliveryReviewService,
  updateDeliveryReviewService,
  deleteDeliveryReviewService,
  getDeliveryReviewStatsService
} from './delivery-review.service.js';

// Crear reseña de delivery
export const createDeliveryReview = async (req, res) => {
  try {
    const validData = createDeliveryReviewSchema.parse(req.body);
    // Pasar id_user autenticado al service
    const result = await createDeliveryReviewService(validData, req.user.id_user);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: { code: 400, message: "Datos inválidos", details: error.issues }
      });
    }
    return res.status(error.status || 500).json({
      error: { code: error.status || 500, message: error.message }
    });
  }
};

// Obtener reseña por ID
export const getDeliveryReviewById = async (req, res) => {
  try {
    const { id } = req.params;

    const reviewId = Number.parseInt(id, 10);
    if (Number.isNaN(reviewId)) {
      return res.status(400).json({
        error: { code: 400, message: "ID inválido" }
      });
    }

    const result = await getDeliveryReviewByIdService(reviewId);
    res.json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.status || 500, message: error.message }
    });
  }
};

// Obtener reseñas de un delivery
export const getDeliveryReviews = async (req, res) => {
  try {
    const { deliveryId } = req.params;

    const deliveryIdNum = Number.parseInt(deliveryId, 10);
    if (Number.isNaN(deliveryIdNum)) {
      return res.status(400).json({
        error: { code: 400, message: "ID inválido" }
      });
    }

    const result = await getDeliveryReviewsService(deliveryIdNum);
    res.json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.status || 500, message: error.message }
    });
  }
};

// Obtener reseña de un pedido
export const getOrderDeliveryReview = async (req, res) => {
  try {
    const { orderId } = req.params;

    const orderIdNum = Number.parseInt(orderId, 10);
    if (Number.isNaN(orderIdNum)) {
      return res.status(400).json({
        error: { code: 400, message: "ID inválido" }
      });
    }

    const result = await getOrderDeliveryReviewService(orderIdNum);
    res.json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.status || 500, message: error.message }
    });
  }
};

// Actualizar reseña
export const updateDeliveryReview = async (req, res) => {
  try {
    const { id } = req.params;

    const reviewId = Number.parseInt(id, 10);
    if (Number.isNaN(reviewId)) {
      return res.status(400).json({
        error: { code: 400, message: "ID inválido" }
      });
    }

    const validData = updateDeliveryReviewSchema.parse(req.body);
    // Pasar id_user autenticado al service
    const result = await updateDeliveryReviewService(reviewId, validData, req.user.id_user);
    res.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: { code: 400, message: "Datos inválidos", details: error.issues }
      });
    }
    return res.status(error.status || 500).json({
      error: { code: error.status || 500, message: error.message }
    });
  }
};

// Eliminar reseña
export const deleteDeliveryReview = async (req, res) => {
  try {
    const { id } = req.params;

    const reviewId = Number.parseInt(id, 10);
    if (Number.isNaN(reviewId)) {
      return res.status(400).json({
        error: { code: 400, message: "ID inválido" }
      });
    }

    // Pasar id_user autenticado al service
    const result = await deleteDeliveryReviewService(reviewId, req.user.id_user);
    res.json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.status || 500, message: error.message }
    });
  }
};

// Obtener estadísticas de reseñas
export const getDeliveryReviewStats = async (req, res) => {
  try {
    const { deliveryId } = req.params;

    const deliveryIdNum = Number.parseInt(deliveryId, 10);
    if (Number.isNaN(deliveryIdNum)) {
      return res.status(400).json({
        error: { code: 400, message: "ID inválido" }
      });
    }

    const result = await getDeliveryReviewStatsService(deliveryIdNum);
    res.json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.status || 500, message: error.message }
    });
  }
};