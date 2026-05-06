// src/modules/commerce/deliveries/delivery-assignments/delivery-assignments.routes.js

import { Router } from "express";
import authenticate from "../../../../config/jwt.config.js";
import { requireRole } from "../../../../middlewares/auth.middleware.js";
import { ROLES } from "../../../../utils/contants/roles.constant.js";
import { getAvailableDeliveriesForOrder } from "./delivery-assignments.controller.js";

const router = Router();

/**
 * @swagger
 * /api/stores/{storeId}/orders/{orderId}/deliveries:
 *   get:
 *     summary: Obtener deliveries disponibles para delegar un pedido
 *     description: |
 *       Retorna los deliveries ACTIVE de la tienda que pueden tomar el pedido,
 *       excluyendo aquellos que ya tienen asignaciones PENDING o ACCEPTED activas.
 *       También devuelve la dirección de entrega del pedido (null si es retiro en tienda).
 *       
 *       Solo accesible para el SELLER dueño del comercio.
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
 *         example: 1
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del pedido a delegar
 *         example: 5
 *     responses:
 *       200:
 *         description: Lista de deliveries disponibles y dirección de entrega
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetAvailableDeliveriesResponse'
 *             examples:
 *               withAddress:
 *                 summary: Con dirección de entrega
 *                 value:
 *                   order_id: 5
 *                   order_status: PENDING
 *                   delivery_address:
 *                     address: "Av. Libertador 1234"
 *                     city: "Ciudad del Este"
 *                     region: "Centro"
 *                     postal_code: "3500"
 *                   available_deliveries:
 *                     - id_delivery: 1
 *                       name: "Carlos López"
 *                       phone: "0981234567"
 *                       avatar_url: null
 *                     - id_delivery: 2
 *                       name: "Juan Pérez"
 *                       phone: "0987654321"
 *                       avatar_url: "https://cdn.example.com/avatar.jpg"
 *               pickupOrder:
 *                 summary: Pedido con retiro en tienda (pickup)
 *                 value:
 *                   order_id: 10
 *                   order_status: PROCESSING
 *                   delivery_address: null
 *                   available_deliveries:
 *                     - id_delivery: 1
 *                       name: "Carlos López"
 *                       phone: "0981234567"
 *                       avatar_url: null
 *               noDeliveries:
 *                 summary: Sin deliveries disponibles
 *                 value:
 *                   order_id: 15
 *                   order_status: PENDING
 *                   delivery_address:
 *                     address: "Calle Principal 456"
 *                     city: "Asunción"
 *                     region: null
 *                     postal_code: null
 *                   available_deliveries: []
 *       400:
 *         description: Pedido en estado no delegable o ya tiene asignación activa
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeliveryAssignmentValidationError'
 *             examples:
 *               invalidStatus:
 *                 summary: Estado no delegable
 *                 value:
 *                   message: "Solo se pueden delegar pedidos en estado PENDING o PROCESSING. Estado actual: DELIVERED"
 *               hasAssignment:
 *                 summary: Ya tiene asignación activa
 *                 value:
 *                   message: "Este pedido ya tiene una asignación activa"
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "No autenticado"
 *       403:
 *         description: No tiene permisos para acceder a este comercio o no es SELLER
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "No tienes permiso para acceder a este comercio"
 *       404:
 *         description: Comercio o pedido no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetAvailableDeliveriesErrorResponse'
 *             examples:
 *               orderNotFound:
 *                 summary: Pedido no encontrado
 *                 value:
 *                   message: "Pedido no encontrado"
 *               storeNotFound:
 *                 summary: Comercio no encontrado
 *                 value:
 *                   message: "Comercio no encontrado"
 */
router.get(
  "/:storeId/orders/:orderId/deliveries",
  authenticate,
  requireRole(ROLES.SELLER),
  getAvailableDeliveriesForOrder
);

export default router;