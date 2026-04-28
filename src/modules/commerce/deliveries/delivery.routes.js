import { Router } from "express";
import authenticate from "../../../config/jwt.config.js";
import { searchDeliveries, createDelivery } from "./delivery.controller.js";

export const deliveryRouter = Router();
export const storeDeliveryRouter = Router();

// GET /api/deliveries/search?q=
deliveryRouter.get("/search", authenticate, searchDeliveries);

// POST /api/stores/{id}/deliveries
storeDeliveryRouter.post("/:id/deliveries", authenticate, createDelivery);
