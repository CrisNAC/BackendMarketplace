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

// GET /api/orders/pending-delivery-reviews — pedidos entregados sin calificación al delivery
orderRouter.get("/pending-delivery-reviews", authenticate, getPendingDeliveryReviews);

// POST /api/orders/:orderId/delivery-review — calificar delivery del pedido entregado
orderRouter.post("/:orderId/delivery-review", authenticate, createDeliveryReview);

// GET  /api/orders/store/:storeId — pedidos del comercio
orderRouter.get("/store/:storeId", authenticate, getStoreOrders);

// PATCH /api/orders/:orderId/status — actualizar estado del pedido
orderRouter.patch("/:orderId/status", authenticate, updateOrderStatus);

export { orderRouter, userOrderRouter };