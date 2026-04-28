//delivery.routes.js
import { Router } from "express";
import authenticate from "../../../../config/jwt.config.js";
import { registerDelivery, loginDelivery, createDelivery, updateDeliveryStatus, getPendingAssignments } from "./delivery.controller.js";

const router = Router();

router.post("/register", registerDelivery);
router.post("/login", loginDelivery);

router.post("/", authenticate, createDelivery);
router.put("/:id/status", authenticate, updateDeliveryStatus);
router.get("/:id/assignments", authenticate, getPendingAssignments);

export default router;