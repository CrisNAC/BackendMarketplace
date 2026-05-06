import { Router } from "express";
import authenticate from "../../../config/jwt.config.js";
import { requireRole } from "../../../middlewares/auth.middleware.js";
import { ROLES } from "../../../utils/contants/roles.constant.js";
import { searchDeliveries, createDelivery, getStoreDeliveryReviews } from "./delivery.controller.js";

export const deliveryRouter = Router();
export const storeDeliveryRouter = Router();

/**
 * @swagger
 * /api/deliveries/search:
 *   get:
 *     summary: Buscar deliveries disponibles para vincular a un comercio
 *     description: Busca usuarios activos con rol DELIVERY por email o telefono y retorna candidatos que aun no tienen un registro de delivery vinculado.
 *     tags: [Deliveries]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Texto a buscar en email o telefono
 *     responses:
 *       200:
 *         description: Candidatos encontrados
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeliverySearchCandidatesResponse'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthErrorResponse'
 *       403:
 *         description: Solo comercios pueden buscar deliveries
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
deliveryRouter.get("/search", authenticate, requireRole(ROLES.SELLER), searchDeliveries);

/**
 * @swagger
 * /api/stores/{id}/deliveries:
 *   post:
 *     summary: Vincular un delivery a un comercio
 *     description: Crea un registro en Deliveries para asociar un usuario DELIVERY al comercio del vendedor autenticado. El delivery se crea con estado INACTIVE por defecto.
 *     tags: [Deliveries]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del comercio
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LinkStoreDeliveryRequest'
 *     responses:
 *       201:
 *         description: Delivery vinculado al comercio
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StoreDeliveryResponse'
 *       400:
 *         description: Datos invalidos o fk_user faltante
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthErrorResponse'
 *       403:
 *         description: No tiene permisos para vincular deliveries a este comercio
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Comercio o candidato a delivery no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: El delivery ya esta vinculado a este comercio o a otro comercio
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
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
