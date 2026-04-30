// src/modules/commerce/deliveries/delivery-assignments/delivery-assignments.routes.js

import { Router } from "express";
import authenticate from "../../../../config/jwt.config.js";
import { requireRole } from "../../../../middlewares/auth.middleware.js";
import { ROLES } from "../../../../utils/contants/roles.constant.js";
import { getAvailableDeliveriesForOrder } from "./delivery-assignments.controller.js";

const router = Router();

/**
 * GET /api/stores/:storeId/orders/:orderId/deliveries
 * Lista los deliveries ACTIVE de la tienda disponibles para tomar el pedido.
 * Solo accesible para el SELLER dueño de la tienda.
 */
router.get(
  "/:storeId/orders/:orderId/deliveries",
  authenticate,
  requireRole(ROLES.SELLER),
  getAvailableDeliveriesForOrder
);

export default router;