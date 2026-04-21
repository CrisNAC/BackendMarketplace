import { reportProductReviewService } from "./review-report.service.js";

/**
 * POST /api/reports/reviews/{reviewId}
 * Reporta una reseña de producto
 * Permite a un usuario autenticado reportar una reseña de producto que considere inapropiada.
 * Body: { reason, description }
 */
export const reportProductReview = async (req, res, next) => {
    try {
        if (!req.user?.id_user) {
            return res.status(401).json({
                success: false,
                message: "Usuario autenticado requerido"
            });
        }
        const { reviewId } = req.params;
        const { reason, description } = req.body;
        const report = await reportProductReviewService(req.user.id_user, reviewId, { reason, description });
        return res.status(201).json({ report });
   
    } catch (error) {
        next(error);
    }
}