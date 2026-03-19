import { Router } from "express";
import { getProductTags } from "./product-tag.controller.js";

const router = Router();

/**
 * @swagger
 * /products/tags:
 *   get:
 *     summary: Listar tags de productos
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar tag por nombre
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Cantidad máxima de tags a retornar (máx. 100)
 *     responses:
 *       200:
 *         description: Lista de tags
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ProductTagResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/", getProductTags);

export default router;