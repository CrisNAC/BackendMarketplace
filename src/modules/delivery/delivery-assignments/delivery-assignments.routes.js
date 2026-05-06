// src/modules/delivery/delivery-assignments/delivery-assignments.routes.js

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

/**
 * @swagger
 * /api/assignments:
 *   post:
 *     summary: Crear una asignación de delivery para un pedido
 *     description: |
 *       Crea una nueva asignación de delivery para un pedido.
 *       Si no se especifica `fk_delivery`, busca automáticamente el primer delivery ACTIVE disponible.
 *       
 *       Solo accesible para SELLER (dueño del comercio).
 *     tags: [Deliveries]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fk_order
 *             properties:
 *               fk_order:
 *                 type: integer
 *                 example: 100
 *                 description: ID del pedido a asignar
 *               fk_delivery:
 *                 type: integer
 *                 nullable: true
 *                 example: 5
 *                 description: ID del delivery (opcional - si se omite, se busca automáticamente)
 *               status:
 *                 type: boolean
 *                 example: true
 *                 description: Estado lógico del registro
 *     responses:
 *       201:
 *         description: Asignación creada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeliveryAssignmentResponse'
 *             example:
 *               id_delivery_assignment: 1
 *               fk_order: 100
 *               fk_delivery: 5
 *               assignment_status: "PENDING"
 *               assignment_sequence: 1
 *               status: true
 *               created_at: "2024-05-04T10:30:00Z"
 *       400:
 *         description: Datos inválidos o faltantes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       example: 400
 *                     message:
 *                       type: string
 *                       example: "Datos inválidos"
 *                     details:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthErrorResponse'
 *       403:
 *         description: No es SELLER
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       example: 403
 *                     message:
 *                       type: string
 *       404:
 *         description: Pedido no encontrado o sin deliveries disponibles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       example: 404
 *                     message:
 *                       type: string
 *                       example: "Pedido no encontrado"
 *       409:
 *         description: Ya existe una asignación PENDING para este pedido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       example: 409
 *                     message:
 *                       type: string
 *                       example: "Ya hay una asignación pendiente para este pedido"
 */
router.post("/", authenticate, requireRole(ROLES.SELLER), createAssignment);

/**
 * @swagger
 * /api/assignments/{id}:
 *   get:
 *     summary: Obtener asignación por ID
 *     description: Retorna los detalles de una asignación específica incluyendo orden y delivery.
 *     tags: [Deliveries]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la asignación
 *         example: 1
 *     responses:
 *       200:
 *         description: Detalles de la asignación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeliveryAssignmentResponse'
 *       400:
 *         description: ID inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       example: 400
 *                     message:
 *                       type: string
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthErrorResponse'
 *       404:
 *         description: Asignación no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       example: 404
 *                     message:
 *                       type: string
 *                       example: "Asignación no encontrada"
 */
router.get("/:id", authenticate, getAssignmentById);

/**
 * @swagger
 * /api/assignments/orders/{orderId}/assignments:
 *   get:
 *     summary: Obtener todas las asignaciones de un pedido
 *     description: Retorna el historial de todas las asignaciones que ha tenido un pedido, ordenadas por sequence.
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
 *         example: 100
 *     responses:
 *       200:
 *         description: Lista de asignaciones del pedido
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DeliveryAssignmentResponse'
 *       400:
 *         description: ID inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: object
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthErrorResponse'
 *       404:
 *         description: Pedido no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: object
 */
router.get("/orders/:orderId/assignments", authenticate, getOrderAssignments);

/**
 * @swagger
 * /api/assignments/deliveries/{deliveryId}/assignments:
 *   get:
 *     summary: Obtener asignaciones de un delivery
 *     description: Retorna todas las asignaciones de un delivery con opción de filtrar por estado.
 *     tags: [Deliveries]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: deliveryId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del delivery
 *         example: 5
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, ACCEPTED, REJECTED, DELIVERED]
 *         description: Filtrar por estado de asignación
 *     responses:
 *       200:
 *         description: Lista de asignaciones del delivery
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id_delivery_assignment:
 *                     type: integer
 *                   fk_delivery:
 *                     type: integer
 *                   assignment_status:
 *                     type: string
 *                   order:
 *                     type: object
 *       400:
 *         description: ID o status inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: object
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthErrorResponse'
 *       404:
 *         description: Delivery no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: object
 */
router.get("/deliveries/:deliveryId/assignments", authenticate, getDeliveryAssignments);

/**
 * @swagger
 * /api/assignments/deliveries/{deliveryId}/pending:
 *   get:
 *     summary: Obtener asignaciones PENDING de un delivery
 *     description: Retorna solo las asignaciones en estado PENDING del delivery.
 *     tags: [Deliveries]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: deliveryId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del delivery
 *         example: 5
 *     responses:
 *       200:
 *         description: Lista de asignaciones PENDING
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthErrorResponse'
 *       404:
 *         description: Delivery no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: object
 */
router.get("/deliveries/:deliveryId/pending", authenticate, getDeliveryPendingAssignments);

/**
 * @swagger
 * /api/assignments/orders/{orderId}/accepted:
 *   get:
 *     summary: Obtener la asignación aceptada de un pedido
 *     description: Retorna la asignación en estado ACCEPTED de un pedido (si existe), incluyendo datos del delivery asignado.
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
 *         example: 100
 *     responses:
 *       200:
 *         description: Asignación aceptada del pedido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id_delivery_assignment:
 *                   type: integer
 *                 fk_order:
 *                   type: integer
 *                 assignment_status:
 *                   type: string
 *                   enum: [ACCEPTED]
 *                 delivery:
 *                   type: object
 *                   properties:
 *                     id_delivery:
 *                       type: integer
 *                     delivery_status:
 *                       type: string
 *                     user:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                         phone:
 *                           type: string
 *       400:
 *         description: ID inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: object
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthErrorResponse'
 *       404:
 *         description: No hay asignación aceptada para este pedido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       example: 404
 *                     message:
 *                       type: string
 *                       example: "No hay asignación aceptada para este pedido"
 */
router.get("/orders/:orderId/accepted", authenticate, getAcceptedAssignment);

/**
 * @swagger
 * /api/assignments/{id}/complete:
 *   post:
 *     summary: Marcar asignación como entregada
 *     description: |
 *       El delivery marca la asignación como completada/entregada.
 *       El pedido pasa a estado DELIVERED.
 *       
 *       Solo el delivery asignado puede completar la asignación, y solo si está en estado ACCEPTED.
 *     tags: [Deliveries]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la asignación
 *         example: 1
 *     responses:
 *       200:
 *         description: Asignación marcada como entregada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeliveryAssignmentResponse'
 *             example:
 *               id_delivery_assignment: 1
 *               fk_order: 100
 *               fk_delivery: 5
 *               assignment_status: "DELIVERED"
 *               assignment_sequence: 1
 *               status: true
 *               created_at: "2024-05-04T10:30:00Z"
 *       400:
 *         description: ID inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       example: 400
 *                     message:
 *                       type: string
 *                       example: "ID inválido"
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthErrorResponse'
 *       403:
 *         description: |
 *           No tiene permisos:
 *           - No es DELIVERY, o
 *           - No es el delivery asignado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       example: 403
 *                     message:
 *                       type: string
 *                       example: "No tienes permiso para completar esta asignación"
 *       404:
 *         description: Asignación no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       example: 404
 *                     message:
 *                       type: string
 *                       example: "Asignación no encontrada"
 *       409:
 *         description: Asignación no está en estado ACCEPTED (ya fue entregada o rechazada)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: integer
 *                       example: 409
 *                     message:
 *                       type: string
 *                       example: "Solo se pueden completar asignaciones aceptadas"
 */
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
 *               $ref: '#/components/schemas/QueryValidationErrorResponse'
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