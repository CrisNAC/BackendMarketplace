import { Router } from "express";
import authenticate from "../../../config/jwt.config.js";
import { requireRole } from "../../../middlewares/auth.middleware.js";
import { ROLES } from "../../../utils/contants/roles.constant.js";
import {
  searchDeliveries,
  createDelivery,
  getStoreDeliveries,
  deleteStoreDelivery,
  getStoreDeliveryReviews,
} from "./delivery.controller.js";

export const deliveryRouter = Router();
export const storeDeliveryRouter = Router();

// GET /api/deliveries/search?q=
deliveryRouter.get("/search", authenticate, requireRole(ROLES.SELLER), searchDeliveries);

// POST /api/stores/:id/deliveries — Vincular delivery al comercio
storeDeliveryRouter.post("/:id/deliveries", authenticate, requireRole(ROLES.SELLER), createDelivery);

/**
 * @swagger
 * /api/stores/{id}/deliveries:
 *   get:
 *     summary: Listar repartidores del comercio
 *     description: >
 *       Retorna todos los repartidores vinculados al comercio junto con estadísticas
 *       agregadas (disponibles, en entrega, total, rating promedio).
 *       Solo accesible por el dueño del comercio.
 *     tags: [Deliveries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del comercio
 *     responses:
 *       200:
 *         description: Lista de repartidores y estadísticas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stats:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     available:
 *                       type: integer
 *                     inDelivery:
 *                       type: integer
 *                     avgRating:
 *                       type: number
 *                       nullable: true
 *                 deliveries:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       user:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           name:
 *                             type: string
 *                           email:
 *                             type: string
 *                           phone:
 *                             type: string
 *                             nullable: true
 *                       status:
 *                         type: string
 *                         enum: [AVAILABLE, IN_DELIVERY, UNAVAILABLE]
 *                       vehicleType:
 *                         type: string
 *                         enum: [CAR, MOTORCYCLE, BICYCLE, ON_FOOT]
 *                       completedDeliveries:
 *                         type: integer
 *                       successRate:
 *                         type: number
 *                         nullable: true
 *                         description: Porcentaje de entregas exitosas sobre el total de terminales (DELIVERED + REJECTED)
 *                       avgRating:
 *                         type: number
 *                         nullable: true
 *                       reviewCount:
 *                         type: integer
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No tiene permisos para acceder a este comercio
 *       404:
 *         description: Comercio no encontrado
 */
storeDeliveryRouter.get("/:id/deliveries", authenticate, requireRole(ROLES.SELLER), getStoreDeliveries);

/**
 * @swagger
 * /api/stores/{id}/deliveries/{deliveryId}:
 *   delete:
 *     summary: Desvincular repartidor del comercio
 *     description: >
 *       Desvincula un repartidor del comercio (fk_store = null). No elimina al usuario.
 *       No se permite desvincular si el repartidor tiene entregas activas (PENDING o ACCEPTED).
 *       Solo accesible por el dueño del comercio.
 *     tags: [Deliveries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del comercio
 *       - in: path
 *         name: deliveryId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del delivery a desvincular
 *     responses:
 *       204:
 *         description: Repartidor desvinculado correctamente
 *       400:
 *         description: El repartidor tiene entregas activas
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No tiene permisos para acceder a este comercio
 *       404:
 *         description: Delivery no encontrado para este comercio
 */
storeDeliveryRouter.delete("/:id/deliveries/:deliveryId", authenticate, requireRole(ROLES.SELLER), deleteStoreDelivery);

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
