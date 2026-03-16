import { getProductReviewsService } from "./product-review.service.js";

export const getProductReviews = async (req, res) => {
    try {
        const result = await getProductReviewsService(req.params.id, req.query);
        return res.status(200).json(result);
    } catch (error) {
        console.error("Error obteniendo reseñas:", error);
        return res.status(error.status || 500).json({
            message: error.message || "Error interno del servidor"
        });
    }
};