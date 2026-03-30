import { Router } from "express";
import authenticate from "../../../config/jwt.config.js";
import { getCarts, addCartItem } from "./cart.controller.js";

const router = Router({ mergeParams: true });

// GET /api/users/:customerId/carts — lista carritos activos por comercio
router.get("/:customerId/carts", authenticate, getCarts);

// POST /api/users/:customerId/cart/items — agrega producto al carrito del comercio correspondiente
router.post("/:customerId/cart/items", authenticate, addCartItem);

export default router;
