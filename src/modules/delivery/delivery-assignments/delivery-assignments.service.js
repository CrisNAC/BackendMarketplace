//delivery-assignments.service.js
import { prisma } from '../../../lib/prisma.js';
 
export const createAssignmentService = async (data) => {
  const { fk_order, fk_delivery, status } = data;
 
  // Verificar que la orden existe
  const order = await prisma.orders.findUnique({
    where: { id_order: fk_order }
  });
  if (!order) {
    throw { status: 404, message: "Pedido no encontrado" };
  }
 
  // Verificar que el delivery existe
  const delivery = await prisma.deliveries.findUnique({
    where: { id_delivery: fk_delivery }
  });
  if (!delivery) {
    throw { status: 404, message: "Delivery no encontrado" };
  }
 
  // Obtener el último intento del pedido
  const lastAssignment = await prisma.deliveryAssignments.findFirst({
    where: { fk_order },
    orderBy: { assignment_sequence: 'desc' },
    select: { assignment_sequence: true }
  });
  const nextSequence = (lastAssignment?.assignment_sequence || 0) + 1;
 
  // Verificar que no hay un intento PENDING activo
  const pendingAssignment = await prisma.deliveryAssignments.findFirst({
    where: {
      fk_order,
      assignment_status: "PENDING"
    }
  });
 
  if (pendingAssignment) {
    throw { status: 409, message: "Ya hay una asignación pendiente para este pedido" };
  }
 
  // Crear el delivery assignment
  const newDeliveryAssignment = await prisma.deliveryAssignments.create({
    data: {
      fk_order,
      fk_delivery,
      assignment_status: "PENDING",
      assignment_sequence: nextSequence,
      status: status !== false
    }
  });
 
  return newDeliveryAssignment;
};
 
// Aceptar asignación
export const acceptAssignmentService = async (id_delivery_assignment, id_user) => {
  const assignment = await prisma.deliveryAssignments.findUnique({
    where: { id_delivery_assignment },
    include: { delivery: true }
  });
 
  // Caso en que no exista el assignment
  if (!assignment) {
    throw { status: 404, message: "Asignación no encontrada" };
  }
 
  // Solo puedes aceptar si está PENDING (validar primero)
  if (assignment.assignment_status !== "PENDING") {
    throw { status: 409, message: "Esta asignación ya fue respondida" };
  }
 
  // Validar que la asignación pertenece al delivery autenticado (después)
  if (assignment.fk_delivery !== id_user) {
    throw { status: 403, message: "No tienes permiso para aceptar esta asignación" };
  }
 
  // Se aprueba la asignación
  const updated = await prisma.deliveryAssignments.update({
    where: { id_delivery_assignment },
    data: { assignment_status: "ACCEPTED" }
  });
 
  return updated;
};
 
// Rechazar asignación
export const rejectAssignmentService = async (id_delivery_assignment, id_user) => {
  const assignment = await prisma.deliveryAssignments.findUnique({
    where: { id_delivery_assignment },
    include: { delivery: true }
  });
 
  // Caso en que no exista el assignment
  if (!assignment) {
    throw { status: 404, message: "Asignación no encontrada" };
  }
 
  // Solo puedes rechazar si está PENDING (validar primero)
  if (assignment.assignment_status !== "PENDING") {
    throw { status: 409, message: "Esta asignación ya fue respondida" };
  }
 
  // Validar que la asignación pertenece al delivery autenticado (después)
  if (assignment.fk_delivery !== id_user) {
    throw { status: 403, message: "No tienes permiso para rechazar esta asignación" };
  }
 
  // Se rechaza la asignación
  const updated = await prisma.deliveryAssignments.update({
    where: { id_delivery_assignment },
    data: { assignment_status: "REJECTED" }
  });
 
  return updated;
};
 
export const getAssignmentByIdService = async (id_delivery_assignment) => {
  const assignment = await prisma.deliveryAssignments.findUnique({
    where: { id_delivery_assignment },
    include: {
      order: {
        select: { id_order: true, total: true, created_at: true }
      },
      delivery: {
        select: { id_delivery: true, delivery_status: true }
      }
    }
  });
 
  if (!assignment) {
    throw { status: 404, message: "Asignación no encontrada" };
  }
 
  return assignment;
};
 
export const getOrderAssignmentsService = async (id_order) => {
  const order = await prisma.orders.findUnique({
    where: { id_order }
  });
 
  if (!order) {
    throw { status: 404, message: "Pedido no encontrado" };
  }
 
  const assignments = await prisma.deliveryAssignments.findMany({
    where: { fk_order: id_order },
    include: {
      delivery: {
        select: { id_delivery: true, delivery_status: true }
      }
    },
    orderBy: { assignment_sequence: 'asc' }
  });
 
  return assignments;
};
 
export const getDeliveryAssignmentsService = async (id_delivery, status = null) => {
  const delivery = await prisma.deliveries.findUnique({
    where: { id_delivery }
  });
 
  if (!delivery) {
    throw { status: 404, message: "Delivery no encontrado" };
  }
 
  const where = { fk_delivery: id_delivery };
  if (status) {
    where.assignment_status = status; // "PENDING", "ACCEPTED", "REJECTED"
  }
 
  const assignments = await prisma.deliveryAssignments.findMany({
    where,
    include: {
      order: {
        select: { id_order: true, total: true, fk_address: true, created_at: true }
      }
    },
    orderBy: { created_at: 'desc' }
  });
 
  return assignments;
};
 
export const getDeliveryPendingAssignmentsService = async (id_delivery) => {
  const delivery = await prisma.deliveries.findUnique({
    where: { id_delivery }
  });
 
  if (!delivery) {
    throw { status: 404, message: "Delivery no encontrado" };
  }
 
  const pendingAssignments = await prisma.deliveryAssignments.findMany({
    where: {
      fk_delivery: id_delivery,
      assignment_status: "PENDING"
    },
    include: {
      order: {
        select: { id_order: true, total: true, fk_address: true }
      }
    },
    orderBy: { created_at: 'desc' }
  });
 
  return pendingAssignments;
};
 
export const getAcceptedAssignmentService = async (id_order) => {
  const order = await prisma.orders.findUnique({
    where: { id_order }
  });
 
  if (!order) {
    throw { status: 404, message: "Pedido no encontrado" };
  }
 
  const acceptedAssignment = await prisma.deliveryAssignments.findFirst({
    where: {
      fk_order: id_order,
      assignment_status: "ACCEPTED"
    },
    include: {
      delivery: {
        select: {
          id_delivery: true,
          delivery_status: true,
          user: { select: { name: true, phone: true } }
        }
      }
    }
  });
 
  if (!acceptedAssignment) {
    throw { status: 404, message: "No hay asignación aceptada para este pedido" };
  }
 
  return acceptedAssignment;
};
 
export const getAssignmentHistoryService = async (id_order) => {
  const order = await prisma.orders.findUnique({
    where: { id_order }
  });
 
  if (!order) {
    throw { status: 404, message: "Pedido no encontrado" };
  }
 
  const history = await prisma.deliveryAssignments.findMany({
    where: { fk_order: id_order },
    include: {
      delivery: {
        select: {
          id_delivery: true,
          delivery_status: true,
          user: { select: { name: true, phone: true } }
        }
      }
    },
    orderBy: { assignment_sequence: 'asc' }
  });
 
  return {
    order_id: id_order,
    total_attempts: history.length,
    assignments: history
  };
};
 
// Eliminar asignación (borrado lógico)
export const deleteAssignmentService = async (id_delivery_assignment, id_user) => {
  const assignment = await prisma.deliveryAssignments.findUnique({
    where: { id_delivery_assignment },
    include: { delivery: true }
  });
 
  if (!assignment) {
    throw { status: 404, message: "Asignación no encontrada" };
  }
 
  // No se puede eliminar si ya fue respondida (validar primero)
  if (assignment.assignment_status !== "PENDING") {
    throw { status: 409, message: "No se puede eliminar: esta asignación ya fue respondida" };
  }
 
  // Validar que la asignación pertenece al delivery autenticado (después)
  if (assignment.fk_delivery !== id_user) {
    throw { status: 403, message: "No tienes permiso para eliminar esta asignación" };
  }
 
  // Borrado lógico
  const deleted = await prisma.deliveryAssignments.update({
    where: { id_delivery_assignment },
    data: { status: false }
  });
 
  return { message: "Asignación eliminada" };
};
 
// Marcar asignación como entregada
export const completeAssignmentService = async (id_delivery_assignment, id_user) => {
  const assignment = await prisma.deliveryAssignments.findUnique({
    where: { id_delivery_assignment },
    include: { delivery: true }
  });
 
  if (!assignment) {
    throw { status: 404, message: "Asignación no encontrada" };
  }
 
  // Solo puedes completar si fue ACCEPTED (validar primero)
  if (assignment.assignment_status !== "ACCEPTED") {
    throw { status: 409, message: "Solo se pueden completar asignaciones aceptadas" };
  }
 
  // Validar que la asignación pertenece al delivery autenticado (después)
  if (assignment.fk_delivery !== id_user) {
    throw { status: 403, message: "No tienes permiso para completar esta asignación" };
  }
 
  // Actualizar asignación a DELIVERED
  const updated = await prisma.deliveryAssignments.update({
    where: { id_delivery_assignment },
    data: { assignment_status: "DELIVERED" }
  });
 
  // Actualizar orden a DELIVERED
  await prisma.orders.update({
    where: { id_order: assignment.fk_order },
    data: { order_status: "DELIVERED" }
  });
 
  return updated;
};