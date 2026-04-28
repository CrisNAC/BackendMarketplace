//delivery-review.routes.js
import { Router } from "express";
import authenticate from "../../../config/jwt.config.js";
import {
  createDeliveryReview,
  getDeliveryReviewById,
  getDeliveryReviews,
  getOrderDeliveryReview,
  updateDeliveryReview,
  deleteDeliveryReview,
  getDeliveryReviewStats
} from "./delivery-review.controller.js";

const router = Router();

// Crear reseña
router.post("/", authenticate, createDeliveryReview);

// Obtener reseña por ID
router.get("/:id", authenticate, getDeliveryReviewById);

// Obtener reseñas de un delivery
router.get("/deliveries/:deliveryId/reviews", authenticate, getDeliveryReviews);

// Obtener estadísticas de reseñas
router.get("/deliveries/:deliveryId/stats", authenticate, getDeliveryReviewStats);

// Obtener reseña de un pedido
router.get("/orders/:orderId/review", authenticate, getOrderDeliveryReview);

// Actualizar reseña
router.put("/:id", authenticate, updateDeliveryReview);

// Eliminar reseña
router.delete("/:id", authenticate, deleteDeliveryReview);

export default router;