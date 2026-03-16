// src/modules/users/product-reviews/product-review.controller.js
import { createProductReviewService } from "./product-review.service.js";

export const createProductReview = async (req, res) => {
  try {
    // TODO: reemplazar por req.user.id cuando esté el middleware de auth
    const customerId = req.headers["x-user-id"];
    const review = await createProductReviewService(req.params.id, customerId, req.body);
    return res.status(201).json(review);
  } catch (error) {
    console.error("Error creando reseña:", error);
    return res.status(error.status || 500).json({
      message: error.message || "Error interno del servidor"
    });
  }
};