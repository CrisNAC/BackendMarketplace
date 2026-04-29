//delivery.assignments.controller.js
import {createAssignmentSchema, acceptAssignmentSchema, rejectAssignmentSchema} from './delivery-assignments.validation.js';
import {
  createAssignmentService,
  acceptAssignmentService,
  rejectAssignmentService,
  getAssignmentByIdService,
  getOrderAssignmentsService,
  getDeliveryAssignmentsService,
  getDeliveryPendingAssignmentsService,
  getAcceptedAssignmentService,
  getAssignmentHistoryService,
  deleteAssignmentService,    
  completeAssignmentService 
} from './delivery-assignments.service.js';

// crear asignación
export const createAssignment = async (req, res) => {
  try {
    const validData = createAssignmentSchema.parse(req.body);
    const result = await createAssignmentService(validData);
    res.status(201).json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

// Aceptar asignación
export const acceptAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    
    // validar que id es numérico
    const assignmentId = parseInt(id);
    if (isNaN(assignmentId)) {
      return res.status(400).json({
        error: { code: 400, message: "ID inválido" }
      });
    }
    
    const result = await acceptAssignmentService(assignmentId);
    res.json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.status || 500, message: error.message }
    });
  }
};
// Rechazar asignación
export const rejectAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await rejectAssignmentService(parseInt(id));
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

// Obtener asignación por ID
export const getAssignmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await getAssignmentByIdService(parseInt(id));
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

// Obtener asignaciones de un pedido
export const getOrderAssignments = async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await getOrderAssignmentsService(parseInt(orderId));
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

// Obtener asignaciones de un delivery
export const getDeliveryAssignments = async (req, res) => {
  try {
    const { deliveryId } = req.params;
    const { status } = req.query;
    
    const deliveryIdNum = parseInt(deliveryId);
    if (isNaN(deliveryIdNum)) {
      return res.status(400).json({
        error: { code: 400, message: "ID inválido" }
      });
    }
    
    // validar status contra enum
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
    const result = await getDeliveryPendingAssignmentsService(parseInt(deliveryId));
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

// Obtener la asignación aceptada de un pedido
export const getAcceptedAssignment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await getAcceptedAssignmentService(parseInt(orderId));
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

// Obtener historial de asignaciones de un pedido
export const getAssignmentHistory = async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await getAssignmentHistoryService(parseInt(orderId));
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

// Eliminar asignación
export const deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await deleteAssignmentService(parseInt(id));
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

// Completar asignación (marcar como entregado)
export const completeAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await completeAssignmentService(parseInt(id));
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};