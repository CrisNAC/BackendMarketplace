import { createProductReviewService } from "./product-review.service.js";

export const createProductReview = async (req, res) => {
  try {
    const customerId = req.user?.id;
    if (!customerId) {
      return res.status(401).json({ message: "No autenticado" });
    }

    const review = await createProductReviewService(req.params.id, customerId, req.body);
    return res.status(201).json(review);
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 500;
    return res.status(status).json({
      message: status < 500 ? error.message : "Error interno del servidor"
    });
  }
};