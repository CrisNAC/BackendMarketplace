//delivery.assignments.routes.js
import { Router } from "express";
import authenticate from "../../../../config/jwt.config.js";
import {
  createAssignment,
  acceptAssignment,
  rejectAssignment,
  getAssignmentById,
  getOrderAssignments,
  getDeliveryAssignments,
  getDeliveryPendingAssignments,
  getAcceptedAssignment,
  getAssignmentHistory
} from "./delivery-assignments.controller.js";

const router = Router();

// Crear asignación (comercio)
router.post("/", authenticate, createAssignment);

// Aceptar asignación (delivery)
router.post("/:id/accept", authenticate, acceptAssignment);

// Rechazar asignación (delivery)
router.post("/:id/reject", authenticate, rejectAssignment);

// Obtener asignación por ID
router.get("/:id", authenticate, getAssignmentById);

// Obtener asignaciones de un pedido
router.get("/orders/:orderId/assignments", authenticate, getOrderAssignments);

// Obtener asignaciones de un delivery (con filtro opcional de status)
router.get("/deliveries/:deliveryId/assignments", authenticate, getDeliveryAssignments);

// Obtener asignaciones PENDING de un delivery
router.get("/deliveries/:deliveryId/pending", authenticate, getDeliveryPendingAssignments);

// Obtener la asignación aceptada de un pedido
router.get("/orders/:orderId/accepted", authenticate, getAcceptedAssignment);

// Obtener historial de asignaciones de un pedido
router.get("/orders/:orderId/history", authenticate, getAssignmentHistory);

export default router;