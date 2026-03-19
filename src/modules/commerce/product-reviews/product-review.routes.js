import { Router } from "express";
import { getProductReviews } from "./product-review.controller.js";

const router = Router();

/**
 * @swagger
 * /products/{id}/reviews:
 *   get:
 *     summary: Obtener reseñas de un producto
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del producto
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Cantidad de reseñas por página (máx. 100)
 *     responses:
 *       200:
 *         description: Reseñas del producto con estadísticas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReviewsListResponse'
 *       400:
 *         description: ID de producto inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Producto no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/:id", getProductReviews);

export default router;