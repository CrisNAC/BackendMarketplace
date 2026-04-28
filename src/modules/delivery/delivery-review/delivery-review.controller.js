//delivery-review.controller.js
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
    const result = await createDeliveryReviewService(validData);
    res.status(201).json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

// Obtener reseña por ID
export const getDeliveryReviewById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await getDeliveryReviewByIdService(parseInt(id));
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

// Obtener reseñas de un delivery
export const getDeliveryReviews = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const result = await getDeliveryReviewsService(parseInt(deliveryId));
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

// Obtener reseña de un pedido
export const getOrderDeliveryReview = async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await getOrderDeliveryReviewService(parseInt(orderId));
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

// Actualizar reseña
export const updateDeliveryReview = async (req, res) => {
  try {
    const { id } = req.params;
    const validData = updateDeliveryReviewSchema.parse(req.body);
    const result = await updateDeliveryReviewService(parseInt(id), validData);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

// Eliminar reseña
export const deleteDeliveryReview = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await deleteDeliveryReviewService(parseInt(id));
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

// Obtener estadísticas de reseñas
export const getDeliveryReviewStats = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const result = await getDeliveryReviewStatsService(parseInt(deliveryId));
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};