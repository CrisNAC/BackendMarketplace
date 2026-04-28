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
    const result = await acceptAssignmentService(parseInt(id));
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
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
    const { status } = req.query;  // status = "PENDING", "ACCEPTED", "REJECTED"
    const result = await getDeliveryAssignmentsService(parseInt(deliveryId), status || null);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
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