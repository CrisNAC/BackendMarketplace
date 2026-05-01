//delivery.assignments.routes.js
import { Router } from "express";
import authenticate from "../../../config/jwt.config.js";
import { requireRole } from "../../../middlewares/auth.middleware.js";
import { ROLES } from "../../../utils/contants/roles.constant.js";
import {
  createAssignment,
  getAssignmentById,
  getOrderAssignments,
  getDeliveryAssignments,
  getDeliveryPendingAssignments,
  getAcceptedAssignment,
  completeAssignment,
  respondToAssignment,
  getDeliveryOrderHistory,
} from "./delivery-assignments.controller.js";
import { parsePagination } from "../../../middlewares/pagination.middleware.js";

const router = Router();

// Crear asignación (comercio)
router.post("/", authenticate, requireRole(ROLES.SELLER), createAssignment);


// Obtener asignación por ID
router.get("/:id", authenticate, getAssignmentById);

// Obtener asignaciones de un pedido
router.get("/orders/:orderId/assignments", authenticate, getOrderAssignments);

// Obtener asignaciones de un delivery 
router.get("/deliveries/:deliveryId/assignments", authenticate, getDeliveryAssignments);

// Obtener asignaciones PENDING de un delivery
router.get("/deliveries/:deliveryId/pending", authenticate, getDeliveryPendingAssignments);

// Obtener la asignación aceptada de un pedido
router.get("/orders/:orderId/accepted", authenticate, getAcceptedAssignment);

// Marcar asignación de delivery como completado
router.post("/:id/complete", authenticate, requireRole(ROLES.DELIVERY), completeAssignment);

/**
 * @swagger
 * /api/assignments/orders/{orderId}/delivery-response:
 *   post:
 *     summary: Aceptar o rechazar un pedido asignado
 *     description: El delivery acepta o rechaza el pedido que le fue asignado. Al aceptar, el pedido pasa a SHIPPED. Al rechazar, se busca el siguiente delivery disponible o el pedido vuelve a PENDING.
 *     tags: [Deliveries]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del pedido
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DeliveryResponseBody'
 *     responses:
 *       200:
 *         description: Respuesta registrada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeliveryResponseSuccess'
 *       400:
 *         description: ID o action inválido
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
 *         description: No es el delivery asignado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeliveryResponseForbidden'
 *       404:
 *         description: Sin asignación pendiente o sin deliveries disponibles
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/DeliveryResponseNotFound'
 *                 - $ref: '#/components/schemas/DeliveryResponseNoAvailable'
 */
router.post("/orders/:orderId/delivery-response", authenticate, requireRole(ROLES.DELIVERY), respondToAssignment);

/**
 * @swagger
 * /api/assignments/{id}/orders:
 *   get:
 *     summary: Historial de pedidos del delivery
 *     description: Retorna el historial de pedidos asignados al delivery con filtros opcionales de período, estado, ID de pedido y nombre de usuario.
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
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 15d, 1m, all]
 *         description: Período de tiempo a filtrar
 *       - in: query
 *         name: assignment_status
 *         schema:
 *           type: string
 *           enum: [PENDING, ACCEPTED, REJECTED, DELIVERED]
 *         description: Estado de la asignación
 *       - in: query
 *         name: orderId
 *         schema:
 *           type: integer
 *         description: ID del pedido a buscar
 *       - in: query
 *         name: userName
 *         schema:
 *           type: string
 *         description: Nombre del usuario que realizó el pedido
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Página actual
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Resultados por página (máximo 100)
 *     responses:
 *       200:
 *         description: Historial de pedidos obtenido correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeliveryOrderHistoryResponse'
 *       400:
 *         description: Parámetros inválidos
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
 *         description: No tiene permisos para ver este historial
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeliveryResponseForbidden'
 *       404:
 *         description: Delivery no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeliveryStatusNotFoundResponse'
 */
router.get("/:id/orders", authenticate, requireRole(ROLES.DELIVERY), parsePagination, getDeliveryOrderHistory);

export default router;