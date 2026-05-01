//delivery.routes.js
import { Router } from "express";
import authenticate from "../../../config/jwt.config.js";
import { ROLES } from "../../../utils/contants/roles.constant.js";
import { requireRole } from "../../../middlewares/auth.middleware.js";
import { upload } from "../../../middlewares/upload.middleware.js";
import {
  registerDelivery,
  updateDeliveryStatus,
  getPendingAssignments,
  getDeliveryById,
  updateDeliveryProfile
} from "./delivery.controller.js";

const router = Router();

/**
 * @swagger
 * /api/deliveries/register:
 *   post:
 *     summary: Registrar usuario autenticado como delivery
 *     description: Cambia el rol de CUSTOMER a DELIVERY y crea el delivery en estado INACTIVE.
 *     tags: [Deliveries]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DeliveryRegisterBody'
 *     responses:
 *       200:
 *         description: Delivery creado y rol actualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeliveryRegisterSuccessResponse'
 *       400:
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeliveryRegisterErrorResponse'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthErrorResponse'
 *       403:
 *         description: Rol no permitido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeliveryRegisterForbiddenResponse'
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeliveryRegisterNotFoundResponse'
 *       409:
 *         description: Ya es delivery
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeliveryRegisterConflictResponse'
 */
router.post("/register", authenticate, registerDelivery);


// Rutas protegidas
router.patch("/:id/status", authenticate, requireRole(ROLES.DELIVERY), updateDeliveryStatus);
router.get("/:id/assignments", authenticate, requireRole(ROLES.DELIVERY), getPendingAssignments);
router.get("/:id", authenticate, requireRole(ROLES.DELIVERY), getDeliveryById);
router.put("/:id", authenticate, requireRole(ROLES.DELIVERY), upload.single("avatarUrl"), updateDeliveryProfile);



export default router;