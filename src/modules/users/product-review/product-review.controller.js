import { createProductReviewService } from "./product-review.service.js";

export const createProductReview = async (req, res) => {
  try {
    // Revisión 1: validación defensiva aunque authenticate ya protege la ruta
    const customerId = req.user?.id_user;
    if (!customerId) {
      return res.status(401).json({
        message: "Token inválido o usuario no autenticado"
      });
    }

    const review = await createProductReviewService(req.params.id, customerId, req.body);
    return res.status(201).json(review);
  } catch (error) {
    const safeMessage =
      error.status < 500 && typeof error?.message === "string" && error.message.trim()
        ? error.message
        : error.status < 500
          ? "Solicitud inválida"
          : "Error interno del servidor";

    return res.status(error.status).json({
      message: safeMessage
    });
  }
};