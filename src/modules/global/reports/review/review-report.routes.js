import { Router } from "express";
import authenticate from "../../../../config/jwt.config.js";
import { reportProductReview } from "./review-report.controller.js";
import { parsePagination } from "../../../../middlewares/pagination.middleware.js";
import {getReviewReportsFiltered, resolveReviewReport} from "./review-report.controller.js";

const router = Router({ mergeParams: true });

/**
 * @swagger
 * /api/reports/reviews/{reviewId}:
 *   post:
 *     summary: Reporta una reseña de producto
 *     description: >
 *       Permite a un usuario autenticado reportar una reseña que considere inapropiada.
 *       Un usuario no puede reportar su propia reseña ni reportar la misma reseña más de una vez.
 *       Si el motivo es OTHER, la descripción es obligatoria.
 *     tags: [Reports]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID de la reseña a reportar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 enum: [SPAM, OFFENSIVE, FAKE, OTHER]
 *                 example: SPAM
 *                 description: Motivo del reporte
 *               description:
 *                 type: string
 *                 example: "Esta reseña parece generada automáticamente"
 *                 description: Descripción adicional. Obligatoria cuando reason es OTHER
 *     responses:
 *       201:
 *         description: Reporte creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 report:
 *                   $ref: '#/components/schemas/ReviewReport'
 *       400:
 *         description: Motivo inválido, descripción faltante para OTHER, o IDs inválidos
 *       401:
 *         description: Usuario autenticado requerido
 *       403:
 *         description: No podés reportar tu propia reseña
 *       404:
 *         description: Usuario o reseña no encontrada
 *       409:
 *         description: Ya has reportado esta reseña
 */
router.post("/reviews/:reviewId", authenticate, reportProductReview);
router.get("/reviews/filtered", authenticate, parsePagination, getReviewReportsFiltered);
router.put("/reviews/:reportId", authenticate, resolveReviewReport);
export default router;