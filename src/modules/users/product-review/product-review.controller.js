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
    // Revisión 2: limitar al rango HTTP válido 400-599, fallback a 500
    const rawStatus = error?.status;
    const status =
      Number.isInteger(rawStatus) && rawStatus >= 400 && rawStatus <= 599
        ? rawStatus
        : 500;

    return res.status(status).json({
      message: status < 500 ? error.message : "Error interno del servidor"
    });
  }
};