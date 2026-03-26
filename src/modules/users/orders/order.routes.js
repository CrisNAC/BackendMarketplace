import { Router } from "express";
import authenticate from "../../../config/jwt.config.js";
import { createOrder, getOrders, getStoreOrders, updateOrderStatus } from "./order.controller.js";

// POST /api/orders — confirma la compra desde un carrito
const router = Router();
router.post("/", authenticate, createOrder);

// GET /api/orders/user/:customerId — historial de pedidos del usuario
router.get("/user/:customerId", authenticate, getOrders);

// GET  /api/orders/store/:storeId — pedidos del comercio
router.get("/store/:storeId", authenticate, getStoreOrders);

// PATCH /api/orders/:orderId/status — actualizar estado del pedido
router.patch("/:orderId/status", authenticate, updateOrderStatus);

export default router;