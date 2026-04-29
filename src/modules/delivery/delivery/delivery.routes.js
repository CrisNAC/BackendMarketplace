//delivery.routes.js
import { Router } from "express";
import authenticate from "../../../config/jwt.config.js";
import { ROLES } from "../../../utils/contants/roles.constant.js";
import { requireRole } from "../../../middlewares/auth.middleware.js";
import {
  registerDelivery,
  loginDelivery,
  createDelivery,
  updateDeliveryStatus,
  getPendingAssignments,
  updateDelivery,
  getDeliveryById,
  getStoreDeliveries,
  getAvailableDeliveries,
  getDeliveryStats,
  deleteDelivery,
  getActiveAssignments
} from "./delivery.controller.js";

const router = Router();

// Rutas públicas
router.post("/register", registerDelivery);
router.post("/login", loginDelivery);

// Rutas protegidas
router.post("/", authenticate, requireRole(ROLES.DELIVERY), createDelivery);
router.patch("/:id/status", authenticate, requireRole(ROLES.DELIVERY), updateDeliveryStatus);
router.get("/:id/assignments", authenticate, requireRole(ROLES.DELIVERY), getPendingAssignments);
router.put("/:id", authenticate, requireRole(ROLES.DELIVERY), updateDelivery);
router.get("/:id", authenticate, requireRole(ROLES.DELIVERY), getDeliveryById);
router.get("/:id/stats", authenticate, requireRole(ROLES.DELIVERY), getDeliveryStats);
router.delete("/:id", authenticate, requireRole(ROLES.DELIVERY), deleteDelivery);
router.get("/:id/active", authenticate, requireRole(ROLES.DELIVERY), getActiveAssignments);

// Rutas de tienda
router.get("/store/:storeId/deliveries", authenticate, requireRole(ROLES.SELLER), getStoreDeliveries);
router.get("/store/:storeId/available", authenticate, requireRole(ROLES.SELLER), getAvailableDeliveries);

export default router;