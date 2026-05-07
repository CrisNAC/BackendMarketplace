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

/**
 * @swagger
 * /api/deliveries/search:
 *   get:
 *     summary: Buscar candidatos a repartidor
 *     description: >
 *       Busca usuarios activos con rol DELIVERY por email o teléfono.
 *       Solo retorna candidatos que aún no están vinculados a ningún comercio.
 *     tags: [Deliveries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: false
 *         schema:
 *           type: string
 *         description: Texto a buscar en email o teléfono del candidato
 *     responses:
 *       200:
 *         description: Lista de candidatos encontrados
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id_user:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   email:
 *                     type: string
 *                   phone:
 *                     type: string
 *                     nullable: true
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Solo vendedores pueden buscar repartidores
 */
deliveryRouter.get("/search", authenticate, requireRole(ROLES.SELLER), searchDeliveries);

/**
 * @swagger
 * /api/stores/{id}/deliveries:
 *   post:
 *     summary: Vincular repartidor al comercio
 *     description: >
 *       Vincula un usuario con rol DELIVERY al comercio del vendedor autenticado.
 *       El repartidor se crea con estado INACTIVE por defecto.
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fk_user
 *             properties:
 *               fk_user:
 *                 type: integer
 *                 description: ID del usuario con rol DELIVERY a vincular
 *     responses:
 *       201:
 *         description: Repartidor vinculado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_delivery:
 *                   type: integer
 *                 fk_store:
 *                   type: integer
 *                 fk_user:
 *                   type: integer
 *                 delivery_status:
 *                   type: string
 *                   example: INACTIVE
 *       400:
 *         description: fk_user faltante o inválido
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No tiene permisos para acceder a este comercio
 *       404:
 *         description: Comercio o candidato no encontrado
 *       409:
 *         description: El repartidor ya está vinculado a un comercio
 */
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