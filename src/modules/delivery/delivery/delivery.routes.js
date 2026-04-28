//delivery.routes.js
import { Router } from "express";
import authenticate from "../../../../config/jwt.config.js";
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
router.post("/", authenticate, createDelivery);
router.put("/:id/status", authenticate, updateDeliveryStatus);
router.get("/:id/assignments", authenticate, getPendingAssignments);
router.put("/:id", authenticate, updateDelivery);
router.get("/:id", authenticate, getDeliveryById);
router.get("/:id/stats", authenticate, getDeliveryStats);
router.delete("/:id", authenticate, deleteDelivery);
router.get("/:id/active", authenticate, getActiveAssignments);

// Rutas de tienda
router.get("/store/:storeId/deliveries", authenticate, getStoreDeliveries);
router.get("/store/:storeId/available", authenticate, getAvailableDeliveries);

export default router;