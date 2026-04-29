//delivery.assignments.routes.js
import { Router } from "express";
import authenticate from "../../../config/jwt.config.js";
import {
  createAssignment,
  getAssignmentById,
  getOrderAssignments,
  getDeliveryAssignments,
  getDeliveryPendingAssignments,
  getAcceptedAssignment,
  completeAssignment
} from "./delivery-assignments.controller.js";

const router = Router();

// Crear asignación (comercio)
router.post("/", authenticate, createAssignment);


// Obtener asignación por ID
router.get("/:id", authenticate, getAssignmentById);

// Obtener asignaciones de un pedido
router.get("/orders/:orderId/assignments", authenticate, getOrderAssignments);

// Obtener asignaciones de un delivery 
router.get("/deliveries/:deliveryId/assignments", authenticate, getDeliveryAssignments);

// Obtener asignaciones PENDING de un delivery
router.get("/deliveries/:deliveryId/pending", authenticate, getDeliveryPendingAssignments);

// Obtener la asignación aceptada de un pedido
router.get("/orders/:orderId/accepted", authenticate, getAcceptedAssignment);

// Marcar asignación de delivery como completado
router.post("/:id/complete", authenticate, completeAssignment);

export default router;