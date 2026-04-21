import { reportProductReviewService, 
         getReviewReportsFilteredService,
         resolveReviewReportService } from "./review-report.service.js";

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

/**
 * GET /api/reports/reviews/filtered
 * Solo ADMIN. Lista reportes de reseñas con filtros y paginación.
 */
export const getReviewReportsFiltered = async (req, res, next) => {
  try {
    if (!req.user?.id_user) {
      return res.status(401).json({
        success: false,
        message: "Usuario autenticado requerido",
      });
    }

    const { report_status, search } = req.query;

    const filteredReports = await getReviewReportsFilteredService(
      req.user.id_user,
      { report_status, search },
      req.pagination
    );

    return res.status(200).json({ filteredReviewReports: filteredReports });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/reports/reviews/:reportId
 * Body: { decision: "KEEP_REVIEW" | "REMOVE_REVIEW" }
 */
export const resolveReviewReport = async (req, res, next) => {
  try {
    if (!req.user?.id_user) {
      return res.status(401).json({
        success: false,
        message: "Usuario autenticado requerido",
      });
    }

    const { reportId } = req.params;
    const { decision } = req.body;

    const result = await resolveReviewReportService(req.user.id_user, reportId, {
      decision,
    });

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};