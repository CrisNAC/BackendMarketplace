import { Router } from "express";
import authenticate from "../../../config/jwt.config.js";
import { requireRole } from "../../../middlewares/auth.middleware.js";
import { ROLES } from "../../../utils/contants/roles.constant.js";
import { searchDeliveries, createDelivery, getStoreDeliveryReviews } from "./delivery.controller.js";

export const deliveryRouter = Router();
export const storeDeliveryRouter = Router();

// GET /api/deliveries/search?q=
deliveryRouter.get("/search", authenticate, requireRole(ROLES.SELLER), searchDeliveries);

// POST /api/stores/{id}/deliveries
storeDeliveryRouter.post("/:id/deliveries", authenticate, requireRole(ROLES.SELLER), createDelivery);

/**
 * @swagger
 * /api/stores/{storeId}/deliveries/{deliveryId}/reviews:
 *   get:
 *     summary: Obtener reseñas de un delivery del comercio
 *     tags: [Deliveries]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del comercio
 *       - in: path
 *         name: deliveryId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del delivery
 *       - in: query
 *         name: search
 *         schema:
 *           type: integer
 *         description: Buscar por ID del pedido
 *       - in: query
 *         name: minRating
 *         schema:
 *           type: integer
 *         description: Calificación mínima (1-5)
 *       - in: query
 *         name: maxRating
 *         schema:
 *           type: integer
 *         description: Calificación máxima (1-5)
 *     responses:
 *       200:
 *         description: Reseñas del delivery
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeliveryReviewListResponse'
 *       400:
 *         description: Parámetros inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalidParams:
 *                 summary: Parametros invalidos
 *                 value:
 *                   message: "minRating debe estar entre 1 y 5"
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               unauthorized:
 *                 summary: No autenticado
 *                 value:
 *                   message: "Usuario autenticado requerido"
 *       403:
 *         description: No tiene permisos para acceder a este comercio
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               forbidden:
 *                 summary: Sin permisos
 *                 value:
 *                   message: "No tiene permisos para editar este comercio"
 *       404:
 *         description: Comercio o delivery no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               notFound:
 *                 summary: Delivery no encontrado
 *                 value:
 *                   message: "Delivery no encontrado para este comercio"
 */
storeDeliveryRouter.get(
	"/:storeId/deliveries/:deliveryId/reviews",
	authenticate,
	requireRole(ROLES.SELLER),
	getStoreDeliveryReviews
);