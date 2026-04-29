import { Router } from "express";
import authenticate from "../../../config/jwt.config.js";
import { requireRole } from "../../../middlewares/auth.middleware.js";
import { ROLES } from "../../../utils/contants/roles.constant.js";
import { searchDeliveries, createDelivery } from "./delivery.controller.js";

export const deliveryRouter = Router();
export const storeDeliveryRouter = Router();

// GET /api/deliveries/search?q=
deliveryRouter.get("/search", authenticate, requireRole(ROLES.SELLER), searchDeliveries);

// POST /api/stores/{id}/deliveries
storeDeliveryRouter.post("/:id/deliveries", authenticate, requireRole(ROLES.SELLER), createDelivery);
