//order.routes.js
import { Router } from "express";
import authenticate from "../../../config/jwt.config.js";
import {
	createDeliveryReview,
	createOrder,
	getOrderShippingQuote,
	getPendingDeliveryReviews,
	getOrders,
	getStoreOrders,
	updateOrderStatus
} from "./order.controller.js";


const orderRouter = Router();
const userOrderRouter = Router();
// POST /api/orders — confirma la compra desde un carrito
orderRouter.post("/", authenticate, createOrder);

// POST /api/orders/shipping-quote — cotiza costo de envío por carrito y dirección
orderRouter.post("/shipping-quote", authenticate, getOrderShippingQuote);

// GET /api/users/:customerId/orders — historial de pedidos del usuario
userOrderRouter.get("/:customerId/orders", authenticate, getOrders);

/**
 * @swagger
 * /api/orders/pending-delivery-reviews:
 *   get:
 *     summary: Pedidos entregados pendientes de calificar al delivery
 *     description: |
 *       Lista pedidos del cliente autenticado en estado **DELIVERED** con al menos un delivery asignado,
 *       que aún no tienen una `delivery_review` del usuario. Solo rol **CUSTOMER**.
 *     tags: [Orders]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Lista (puede ser vacía) de pedidos pendientes de reseña
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PendingDeliveryReviewsResponse'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthErrorResponse'
 *       403:
 *         description: Solo clientes pueden consultar o calificar deliveries
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 */
orderRouter.get("/pending-delivery-reviews", authenticate, getPendingDeliveryReviews);

/**
 * @swagger
 * /api/orders/{orderId}/delivery-review:
 *   post:
 *     summary: Calificar al delivery de un pedido entregado
 *     description: |
 *       Crea la reseña de delivery para el pedido indicado. El pedido debe estar **DELIVERED**,
 *       pertenecer al cliente autenticado, tener delivery asignado y no tener ya una calificación.
 *       Solo rol **CUSTOMER**.
 *     tags: [Orders]
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
 *             $ref: '#/components/schemas/CreateDeliveryReviewRequest'
 *     responses:
 *       201:
 *         description: Calificación registrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateDeliveryReviewResponse'
 *       400:
 *         description: Validación (rating fuera de rango, comentario muy largo, pedido no entregado, sin delivery asignado, etc.)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthErrorResponse'
 *       403:
 *         description: Solo clientes pueden calificar deliveries
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *       404:
 *         description: Pedido no encontrado o usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 *       409:
 *         description: El pedido ya tiene una calificación de delivery
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorEnvelope'
 */
orderRouter.post("/:orderId/delivery-review", authenticate, createDeliveryReview);

// GET  /api/orders/store/:storeId — pedidos del comercio
orderRouter.get("/store/:storeId", authenticate, getStoreOrders);

// PATCH /api/orders/:orderId/status — actualizar estado del pedido
orderRouter.patch("/:orderId/status", authenticate, updateOrderStatus);

export { orderRouter, userOrderRouter };