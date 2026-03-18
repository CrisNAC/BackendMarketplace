import { createProductReviewService } from "./product-review.service.js";

export const createProductReview = async (req, res) => {
  try {
    const customerId = req.user.id_user; // ← viene del JWT via authenticate
    const review = await createProductReviewService(req.params.id, customerId, req.body);
    return res.status(201).json(review);
  } catch (error) {
    console.error("Error creando reseña:", error);
    const status = Number.isInteger(error?.status) ? error.status : 500;
    return res.status(status).json({
      message: status < 500 ? error.message : "Error interno del servidor"
    });
  }
};