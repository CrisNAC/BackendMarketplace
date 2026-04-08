import { Router } from "express";
import authenticate from "../../../config/jwt.config.js";
import {
	createOrder,
	getOrderShippingQuote,
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

// GET  /api/orders/store/:storeId — pedidos del comercio
orderRouter.get("/store/:storeId", authenticate, getStoreOrders);

// PATCH /api/orders/:orderId/status — actualizar estado del pedido
orderRouter.patch("/:orderId/status", authenticate, updateOrderStatus);

export { orderRouter, userOrderRouter };