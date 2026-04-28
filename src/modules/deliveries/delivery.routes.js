import { Router } from "express";
import authenticate from "../../config/jwt.config.js";
import { requireRole } from "../../middlewares/auth.middleware.js";
import { ROLES } from "../../utils/contants/roles.constant.js";
import { updateDeliveryStatus } from "./delivery.controller.js";

const router = Router();

/**
 * @swagger
 * /api/deliveries/{id}/status:
 *   patch:
 *     summary: Actualizar estado de disponibilidad del delivery
 *     description: Permite al delivery cambiar su estado para indicar si puede recibir pedidos.
 *     tags: [Deliveries]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del delivery
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateDeliveryStatusBody'
 *     responses:
 *       200:
 *         description: Estado actualizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeliveryStatusSuccessResponse'
 *       400:
 *         description: ID o delivery_status inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeliveryStatusErrorResponse'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthErrorResponse'
 *       403:
 *         description: No tiene permisos para actualizar este delivery
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeliveryStatusForbiddenResponse'
 *       404:
 *         description: Delivery no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeliveryStatusNotFoundResponse'
 */
router.patch("/:id/status", authenticate, requireRole(ROLES.DELIVERY), updateDeliveryStatus);

export default router;