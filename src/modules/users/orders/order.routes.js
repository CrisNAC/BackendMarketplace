import { Router } from "express";
import authenticate from "../../../config/jwt.config.js";
import { createOrder, getOrders } from "./order.controller.js";

// POST /api/orders — confirma la compra desde una wishlist
const orderRouter = Router();
orderRouter.post("/", authenticate, createOrder);

// GET /api/users/:customerId/orders — historial de pedidos del usuario
const userOrderRouter = Router();
userOrderRouter.get("/:customerId/orders", authenticate, getOrders);

export { orderRouter, userOrderRouter };