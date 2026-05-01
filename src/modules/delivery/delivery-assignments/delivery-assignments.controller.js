//delivery.assignments.controller.js
import { ZodError } from 'zod';
import { createAssignmentSchema, respondToAssignmentSchema } from './delivery-assignments.validation.js';
import {
  createAssignmentService,
  getAssignmentByIdService,
  getOrderAssignmentsService,
  getDeliveryAssignmentsService,
  getDeliveryPendingAssignmentsService,
  getAcceptedAssignmentService,
  completeAssignmentService,
  respondToAssignmentService,
} from './delivery-assignments.service.js';

// Crear asignación
export const createAssignment = async (req, res) => {
  try {
    const validData = createAssignmentSchema.parse(req.body);
    const result = await createAssignmentService(validData);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: { code: 400, message: "Datos inválidos", details: error.issues }
      });
    }
    return res.status(error.status || 500).json({
      error: { code: error.status || 500, message: error.message }
    });
  }
};

// Obtener asignación por ID
export const getAssignmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const assignmentId = Number.parseInt(id, 10);
    if (Number.isNaN(assignmentId)) {
      return res.status(400).json({
        error: { code: 400, message: "ID inválido" }
      });
    }

    const result = await getAssignmentByIdService(assignmentId);
    res.json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.status || 500, message: error.message }
    });
  }
};

// Obtener asignaciones de un pedido
export const getOrderAssignments = async (req, res) => {
  try {
    const { orderId } = req.params;

    const orderIdNum = Number.parseInt(orderId, 10);
    if (Number.isNaN(orderIdNum)) {
      return res.status(400).json({
        error: { code: 400, message: "ID inválido" }
      });
    }

    const result = await getOrderAssignmentsService(orderIdNum);
    res.json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.status || 500, message: error.message }
    });
  }
};

// Obtener asignaciones de un delivery
export const getDeliveryAssignments = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { status } = req.query;

    const deliveryIdNum = Number.parseInt(deliveryId, 10);
    if (Number.isNaN(deliveryIdNum)) {
      return res.status(400).json({
        error: { code: 400, message: "ID inválido" }
      });
    }

    // Validar status contra enum
    const validStatuses = ["PENDING", "ACCEPTED", "REJECTED", "DELIVERED"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        error: { code: 400, message: `Status inválido. Debe ser uno de: ${validStatuses.join(", ")}` }
      });
    }

    const result = await getDeliveryAssignmentsService(deliveryIdNum, status || null);
    res.json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.status || 500, message: error.message }
    });
  }
};

// Obtener asignaciones PENDING de un delivery
export const getDeliveryPendingAssignments = async (req, res) => {
  try {
    const { deliveryId } = req.params;

    const deliveryIdNum = Number.parseInt(deliveryId, 10);
    if (Number.isNaN(deliveryIdNum)) {
      return res.status(400).json({
        error: { code: 400, message: "ID inválido" }
      });
    }

    const result = await getDeliveryPendingAssignmentsService(deliveryIdNum);
    res.json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.status || 500, message: error.message }
    });
  }
};

// Obtener la asignación aceptada de un pedido
export const getAcceptedAssignment = async (req, res) => {
  try {
    const { orderId } = req.params;

    const orderIdNum = Number.parseInt(orderId, 10);
    if (Number.isNaN(orderIdNum)) {
      return res.status(400).json({
        error: { code: 400, message: "ID inválido" }
      });
    }

    const result = await getAcceptedAssignmentService(orderIdNum);
    res.json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.status || 500, message: error.message }
    });
  }
};

// Completar asignación (marcar como entregado)
export const completeAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    const assignmentId = Number.parseInt(id, 10);
    if (Number.isNaN(assignmentId)) {
      return res.status(400).json({
        error: { code: 400, message: "ID inválido" }
      });
    }

    // Pasar id_user autenticado al service
    const result = await completeAssignmentService(assignmentId, req.user.id_user);
    res.json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.status || 500, message: error.message }
    });
  }
};

export const respondToAssignment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const validData = respondToAssignmentSchema.parse(req.body);
    const result = await respondToAssignmentService(orderId, req.user.id_user, validData.action);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: { code: 400, message: "Datos inválidos", details: error.issues }
      });
    }
    return res.status(error.status || 500).json({
      error: { code: error.status || 500, message: error.message }
    });
  }
};