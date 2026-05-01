//delivery-assignments.service.js
import { prisma } from '../../../lib/prisma.js';

export const createAssignmentService = async (data) => {
  const { fk_order, fk_delivery: fk_delivery_input, status } = data;

  const order = await prisma.orders.findUnique({
    where: { id_order: fk_order }
  });
  if (!order) {
    throw { status: 404, message: "Pedido no encontrado" };
  }

  let fk_delivery = fk_delivery_input;

  if (!fk_delivery) {
    const delivery = await prisma.deliveries.findFirst({
      where: {
        fk_store: order.fk_store,
        delivery_status: "ACTIVE",
        status: true,
        delivery_assignments: {
          none: { assignment_status: "PENDING" }
        }
      }
    });

    if (!delivery) {
      throw { status: 404, message: "No hay deliveries disponibles para este comercio" };
    }

    fk_delivery = delivery.id_delivery;
  } else {
    const delivery = await prisma.deliveries.findUnique({
      where: { id_delivery: fk_delivery }
    });
    if (!delivery) {
      throw { status: 404, message: "Delivery no encontrado" };
    }
  }

  // Lectura del último sequence + chequeo de PENDING + insert dentro de una transacción
  // para evitar que dos requests concurrentes generen sequence duplicado o doble PENDING
  try {
    const newDeliveryAssignment = await prisma.$transaction(async (tx) => {
      // Obtener el último sequence del pedido
      const lastAssignment = await tx.deliveryAssignments.findFirst({
        where: { fk_order },
        orderBy: { assignment_sequence: 'desc' },
        select: { assignment_sequence: true }
      });
      const nextSequence = (lastAssignment?.assignment_sequence || 0) + 1;

      // Verificar que no hay un intento PENDING activo
      const pendingAssignment = await tx.deliveryAssignments.findFirst({
        where: { fk_order, assignment_status: "PENDING" }
      });

      if (pendingAssignment) {
        throw { status: 409, message: "Ya hay una asignación pendiente para este pedido" };
      }

      // Crear el delivery assignment
      return tx.deliveryAssignments.create({
        data: {
          fk_order,
          fk_delivery,
          assignment_status: "PENDING",
          assignment_sequence: nextSequence,
          status: status !== false
        }
      });
    });

    return newDeliveryAssignment;
  } catch (error) {
    // Si Prisma lanza un error de unique constraint (P2002), significa que dos requests
    // concurrentes llegaron al mismo tiempo y ya existe ese sequence — tratar como 409
    if (error?.code === 'P2002') {
      throw { status: 409, message: "Ya hay una asignación pendiente para este pedido" };
    }
    // Re-lanzar cualquier otro error (incluyendo el 409 del PENDING check)
    throw error;
  }
};

// Obtener asignación por ID
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
// Obtener asignaciones de un pedido
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
// Obtener asignaciones de un delivery 
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
// Obtener asignaciones PENDING de un delivery
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
// Obtener la asignación aceptada de un pedido
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


// Marcar asignación como entregada
export const completeAssignmentService = async (id_delivery_assignment, id_user) => {
  const assignment = await prisma.deliveryAssignments.findUnique({
    where: { id_delivery_assignment },
    include: { delivery: true }
  });

  if (!assignment) {
    throw { status: 404, message: "Asignación no encontrada" };
  }

  // Validar status antes que ownership para que los tests de estado fallen con 409
  if (assignment.assignment_status !== "ACCEPTED") {
    throw { status: 409, message: "Solo se pueden completar asignaciones aceptadas" };
  }

  if (assignment.delivery?.fk_user !== id_user) {
    throw { status: 403, message: "No tienes permiso para completar esta asignación" };
  }

  // Ambas escrituras dentro de una transacción para que sean atómicas:
  // si orders.update falla, deliveryAssignments.update se revierte automáticamente
  const updated = await prisma.$transaction(async (tx) => {
    const updatedAssignment = await tx.deliveryAssignments.update({
      where: { id_delivery_assignment },
      data: { assignment_status: "DELIVERED" }
    });

    await tx.orders.update({
      where: { id_order: assignment.fk_order },
      data: { order_status: "DELIVERED" }
    });

    return updatedAssignment;
  });

  return updated;
};

export const respondToAssignmentService = async (orderId, userId, action) => {
  const parsedOrderId = Number(orderId);
  if (!Number.isInteger(parsedOrderId) || parsedOrderId <= 0) {
    throw { status: 400, message: "ID de orden inválido" };
  }

  const assignment = await prisma.deliveryAssignments.findFirst({
    where: {
      fk_order: parsedOrderId,
      assignment_status: "PENDING",
      status: true
    },
    include: {
      delivery: true,
      order: true
    }
  });

  if (!assignment) {
    throw { status: 404, message: "No hay asignación pendiente para este pedido" };
  }

  if (assignment.delivery.fk_user !== userId) {
    throw { status: 403, message: "No tienes permiso para responder esta asignación" };
  }

  if (action === "ACCEPT") {
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.deliveryAssignments.update({
        where: { id_delivery_assignment: assignment.id_delivery_assignment },
        data: { assignment_status: "ACCEPTED" }
      });

      await tx.orders.update({
        where: { id_order: parsedOrderId },
        data: { order_status: "SHIPPED" }
      });

      return updated;
    });
  }

  // REJECT
  return await prisma.$transaction(async (tx) => {
    await tx.deliveryAssignments.update({
      where: { id_delivery_assignment: assignment.id_delivery_assignment },
      data: { assignment_status: "REJECTED" }
    });

    const nextDelivery = await tx.deliveries.findFirst({
      where: {
        fk_store: assignment.order.fk_store,
        delivery_status: "ACTIVE",
        status: true,
        id_delivery: { not: assignment.fk_delivery },
        delivery_assignments: {
          none: { assignment_status: "PENDING" }
        }
      }
    });

    if (!nextDelivery) {
      await tx.orders.update({
        where: { id_order: parsedOrderId },
        data: { order_status: "PENDING" }
      });
      throw { status: 404, message: "No hay deliveries disponibles, el pedido vuelve a pendiente" };
    }

    const lastAssignment = await tx.deliveryAssignments.findFirst({
      where: { fk_order: parsedOrderId },
      orderBy: { assignment_sequence: "desc" },
      select: { assignment_sequence: true }
    });

    return tx.deliveryAssignments.create({
      data: {
        fk_order: parsedOrderId,
        fk_delivery: nextDelivery.id_delivery,
        assignment_status: "PENDING",
        assignment_sequence: (lastAssignment?.assignment_sequence || 0) + 1,
        status: true
      }
    });
  });
};

export const getDeliveryOrderHistoryService = async (deliveryId, authenticatedUserId, filters, pagination) => {
  const parsedDeliveryId = Number(deliveryId);
  if (!Number.isInteger(parsedDeliveryId) || parsedDeliveryId <= 0) {
    throw { status: 400, message: "ID de delivery inválido" };
  }

  const delivery = await prisma.deliveries.findUnique({
    where: { id_delivery: parsedDeliveryId },
    select: { id_delivery: true, fk_user: true, status: true }
  });

  if (!delivery || !delivery.status) {
    throw { status: 404, message: "Delivery no encontrado" };
  }

  if (delivery.fk_user !== authenticatedUserId) {
    throw { status: 403, message: "No tienes permiso para ver este historial" };
  }

  const { period, assignment_status, orderId, userName } = filters;
  const { page, limit, skip } = pagination;

  // ─── FILTRO DE PERÍODO ────────────────────────────────────────────────────
  let dateFilter = undefined;
  if (period && period !== "all") {
    const now = new Date();
    const daysMap = { "7d": 7, "15d": 15, "1m": 30 };
    const days = daysMap[period];
    const from = new Date(now);
    from.setDate(from.getDate() - days);
    dateFilter = { gte: from };
  }

  // ─── WHERE DE ASIGNACIONES ────────────────────────────────────────────────
  const assignmentWhere = {
    fk_delivery: parsedDeliveryId,
    status: true,
    ...(assignment_status && { assignment_status }),
    ...(dateFilter && { created_at: dateFilter }),
    ...(orderId && { fk_order: orderId }),
    ...(userName && {
      order: {
        user: {
          name: { contains: userName, mode: "insensitive" }
        }
      }
    })
  };

  const [assignments, totalElements] = await prisma.$transaction([
    prisma.deliveryAssignments.findMany({
      where: assignmentWhere,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id_delivery_assignment: true,
        assignment_status: true,
        assignment_sequence: true,
        created_at: true,
        order: {
          select: {
            id_order: true,
            order_status: true,
            total: true,
            shipping_cost: true,
            created_at: true,
            user: {
              select: { id_user: true, name: true }
            },
            store: {
              select: { id_store: true, name: true }
            }
          }
        }
      }
    }),
    prisma.deliveryAssignments.count({ where: assignmentWhere })
  ]);

  return {
    content: assignments.map((a) => ({
      id_delivery_assignment: a.id_delivery_assignment,
      assignment_status: a.assignment_status,
      assignment_sequence: a.assignment_sequence,
      created_at: a.created_at,
      order: {
        id_order: a.order.id_order,
        order_status: a.order.order_status,
        total: Number(a.order.total),
        shipping_cost: Number(a.order.shipping_cost),
        created_at: a.order.created_at,
        user: a.order.user,
        store: a.order.store
      }
    })),
    total_elements: totalElements,
    total_pages: Math.ceil(totalElements / limit),
    page,
    size: limit
  };
};