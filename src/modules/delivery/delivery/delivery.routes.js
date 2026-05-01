//delivery.routes.js
import { Router } from "express";
import authenticate from "../../../config/jwt.config.js";
import { ROLES } from "../../../utils/contants/roles.constant.js";
import { requireRole } from "../../../middlewares/auth.middleware.js";
import { upload } from "../../../middlewares/upload.middleware.js";
import {
  registerDelivery,
  updateDeliveryStatus,
  getPendingAssignments,
  getDeliveryById,
  updateDeliveryProfile
} from "./delivery.controller.js";

const router = Router();

// Rutas públicas
router.post("/register", registerDelivery);


// Rutas protegidas
router.patch("/:id/status", authenticate, requireRole(ROLES.DELIVERY), updateDeliveryStatus);
router.get("/:id/assignments", authenticate, requireRole(ROLES.DELIVERY), getPendingAssignments);
router.get("/:id", authenticate, requireRole(ROLES.DELIVERY), getDeliveryById);
router.put("/:id", authenticate, requireRole(ROLES.DELIVERY), upload.single("avatarUrl"), updateDeliveryProfile);



export default router;