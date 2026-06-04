//delivery-assignments.service.js
import { prisma } from '../../../lib/prisma.js';
import { logSecurityEvent } from '../../../lib/security-logger.js';
import {
  activePendingAssignmentWhere,
  closePendingAndReassign,
  createPendingAssignmentForOrder,
  expireStalePendingAssignments,
  findNextActiveDeliveryForOrder,
  getTriedDeliveryIdsForOrder,
  isAssignmentResponseWindowOpen,
} from "./delivery-assignment-workflow.service.js";

const resolveAuth = (authenticatedUser) => {
  const id_user = authenticatedUser?.id_user ?? authenticatedUser?.id;
  const role = authenticatedUser?.role;

  if (!id_user || !role) {
    throw { status: 403, message: "No tienes permiso para acceder a este recurso" };
  }

  return { id_user, role };
};

const ensureOrderAccess = async (order, auth) => {
  if (auth.role === "SELLER") {
    const store = await prisma.stores.findFirst({
      where: { id_store: order.fk_store, fk_user: auth.id_user, status: true },
      select: { id_store: true }
    });

    if (!store) {
      throw { status: 403, message: "No tienes permiso para acceder a este pedido" };
    }

    return;
  }

  if (auth.role === "CUSTOMER") {
    if (order.fk_user !== auth.id_user) {
      throw { status: 403, message: "No tienes permiso para acceder a este pedido" };
    }
    return;
  }

  if (auth.role === "DELIVERY") {
    const assignment = await prisma.deliveryAssignments.findFirst({
      where: {
        fk_order: order.id_order,
        status: true,
        delivery: { is: { fk_user: auth.id_user, status: true, delivery_status: 'ACTIVE' } }
      },
      select: { id_delivery_assignment: true }
    });

    if (!assignment) {
      throw { status: 403, message: "No tienes permiso para acceder a este pedido" };
    }

    return;
  }

  throw { status: 403, message: "No tienes permiso para acceder a este recurso" };
};

export const createAssignmentService = async (data, authenticatedUser) => {
  const auth = resolveAuth(authenticatedUser);
  if (auth.role !== "SELLER") {
    throw { status: 403, message: "No tienes permiso para asignar deliveries" };
  }

  const { fk_order, fk_delivery: fk_delivery_input, status } = data;
  const pendingAuditLogs = [];

  const order = await prisma.orders.findUnique({
    where: { id_order: fk_order },
    select: {
      id_order: true,
      fk_store: true,
      store: { select: { fk_user: true, status: true } }
    }
  });
  if (!order) {
    throw { status: 404, message: "Pedido no encontrado" };
  }

  if (order.store?.fk_user !== auth.id_user) {
    throw { status: 403, message: "No tienes permiso para asignar este pedido" };
  }

  if (!order.store?.status) {
    throw { status: 403, message: "No tienes permiso para asignar este pedido" };
  }

  try {
    const newDeliveryAssignment = await prisma.$transaction(async (tx) => {
      await expireStalePendingAssignments({ fk_order }, tx);

      const pendingAssignment = await tx.deliveryAssignments.findFirst({
        where: {
          fk_order,
          ...activePendingAssignmentWhere(),
        },
        include: {
          delivery: {
            select: { delivery_status: true }
          }
        }
      });

      if (pendingAssignment) {
        const deliveryStatus = pendingAssignment.delivery?.delivery_status;

        if (deliveryStatus === "INACTIVE") {
          await tx.deliveryAssignments.update({
            where: { id_delivery_assignment: pendingAssignment.id_delivery_assignment },
            data: { assignment_status: "REJECTED", status: false }
          });
          pendingAuditLogs.push({
            event: "ASSIGNMENT_STATUS_CHANGED",
            details: {
              assignmentId: pendingAssignment.id_delivery_assignment,
              orderId: fk_order,
              deliveryId: pendingAssignment.fk_delivery,
              previousStatus: pendingAssignment.assignment_status,
              newStatus: "REJECTED",
              reason: "offline",
            }
          });
        } else if (isAssignmentResponseWindowOpen(pendingAssignment)) {
          throw { status: 409, message: "Ya hay una asignación pendiente para este pedido" };
        } else {
          const previousStatus = pendingAssignment.assignment_status;
          await closePendingAndReassign(tx, pendingAssignment, "EXPIRED");
          pendingAuditLogs.push({
            event: "ASSIGNMENT_STATUS_CHANGED",
            details: {
              assignmentId: pendingAssignment.id_delivery_assignment,
              orderId: fk_order,
              deliveryId: pendingAssignment.fk_delivery,
              previousStatus,
              newStatus: "EXPIRED",
            }
          });
          const stillPending = await tx.deliveryAssignments.findFirst({
            where: { fk_order, ...activePendingAssignmentWhere() }
          });
          if (stillPending) {
            throw { status: 409, message: "Ya hay una asignación pendiente para este pedido" };
          }
        }
      }

      let fk_delivery = fk_delivery_input;

      if (!fk_delivery) {
        const triedIds = await getTriedDeliveryIdsForOrder(fk_order, tx);
        const delivery = await findNextActiveDeliveryForOrder(order.fk_store, triedIds, tx);

        if (!delivery) {
          await tx.orders.update({
            where: { id_order: fk_order },
            data: { delivery_unavailable: true }
          });
          throw { status: 404, message: "No hay deliveries disponibles para este comercio" };
        }

        fk_delivery = delivery.id_delivery;
      } else {
        const delivery = await tx.deliveries.findUnique({
          where: { id_delivery: fk_delivery },
          select: { id_delivery: true, delivery_status: true, status: true, fk_store: true }
        });
        if (!delivery) {
          throw { status: 404, message: "Delivery no encontrado" };
        }
        if (delivery.fk_store !== order.fk_store) {
          throw { status: 403, message: "El delivery no pertenece al comercio del pedido" };
        }
        if (delivery.delivery_status !== "ACTIVE" || !delivery.status) {
          throw { status: 400, message: "El delivery debe estar activo para recibir pedidos" };
        }
      }

      return createPendingAssignmentForOrder(tx, {
        fk_order,
        fk_delivery,
      });
    });

    pendingAuditLogs.push({
      event: "ASSIGNMENT_STATUS_CHANGED",
      details: {
      assignmentId: newDeliveryAssignment.id_delivery_assignment,
      orderId: fk_order,
      deliveryId: newDeliveryAssignment.fk_delivery,
      previousStatus: null,
      newStatus: newDeliveryAssignment.assignment_status ?? "PENDING",
      }
    });

    for (const { event, details } of pendingAuditLogs) {
      logSecurityEvent(event, details);
    }

    return newDeliveryAssignment;
  } catch (error) {
    if (error?.code === 'P2002') {
      throw { status: 409, message: "Ya hay una asignación pendiente para este pedido" };
    }
    throw error;
  }
};

// Obtener asignación por ID
export const getAssignmentByIdService = async (id_delivery_assignment, authenticatedUser) => {
  const auth = resolveAuth(authenticatedUser);

  const assignment = await prisma.deliveryAssignments.findUnique({
    where: { id_delivery_assignment },
    include: {
      order: {
        select: {
          id_order: true,
          total: true,
          created_at: true,
          fk_user: true,
          store: { select: { fk_user: true } }
        }
      },
      delivery: {
        select: { id_delivery: true, delivery_status: true, fk_user: true }
      }
    }
  });

  if (!assignment) {
    throw { status: 404, message: "Asignación no encontrada" };
  }

  if (auth.role === "SELLER") {
    if (assignment.order?.store?.fk_user !== auth.id_user) {
      throw { status: 403, message: "No tienes permiso para ver esta asignación" };
    }
  } else if (auth.role === "CUSTOMER") {
    if (assignment.order?.fk_user !== auth.id_user) {
      throw { status: 403, message: "No tienes permiso para ver esta asignación" };
    }
  } else if (auth.role === "DELIVERY") {
    if (assignment.delivery?.fk_user !== auth.id_user) {
      throw { status: 403, message: "No tienes permiso para ver esta asignación" };
    }
  } else {
    throw { status: 403, message: "No tienes permiso para ver esta asignación" };
  }

  return assignment;
};
// Obtener asignaciones de un pedido
export const getOrderAssignmentsService = async (id_order, authenticatedUser) => {
  const auth = resolveAuth(authenticatedUser);
  if (![
    "SELLER",
    "CUSTOMER",
    "DELIVERY",
  ].includes(auth.role)) {
    throw { status: 403, message: "No tienes permiso para ver asignaciones" };
  }

  const order = await prisma.orders.findUnique({
    where: { id_order },
    select: { id_order: true, fk_store: true, fk_user: true }
  });

  if (!order) {
    throw { status: 404, message: "Pedido no encontrado" };
  }

  await ensureOrderAccess(order, auth);

  await expireStalePendingAssignments({ fk_order: id_order });

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
export const getDeliveryAssignmentsService = async (id_delivery, authenticatedUser, status = null) => {
  const auth = resolveAuth(authenticatedUser);
  if (auth.role !== "DELIVERY") {
    throw { status: 403, message: "No tienes permiso para ver asignaciones de delivery" };
  }

  const delivery = await prisma.deliveries.findUnique({
    where: { id_delivery },
    select: { id_delivery: true, fk_user: true }
  });

  if (!delivery) {
    throw { status: 404, message: "Delivery no encontrado" };
  }

  if (delivery.fk_user !== auth.id_user) {
    throw { status: 403, message: "No tienes permiso para ver asignaciones de este delivery" };
  }

  await expireStalePendingAssignments({ fk_delivery: id_delivery });

  const where = {
    fk_delivery: id_delivery,
    delivery: { is: { fk_user: auth.id_user, status: true, delivery_status: 'ACTIVE' } }
  };
  if (status) {
    where.assignment_status = status;
  }

  const assignments = await prisma.deliveryAssignments.findMany({
    where,
    include: {
      order: {
        include: {
          user: {
            select: {
              id_user: true,
              name: true,
              email: true,
              phone: true
            }
          },
          address: {
            select: {
              id_address: true,
              address: true,
              city: true,
              region: true,
              postal_code: true,
              latitude: true,
              longitude: true
            }
          }
        }
      }
    },
    orderBy: { created_at: 'desc' }
  });

  return assignments;
};
// Obtener asignaciones PENDING de un delivery
export const getDeliveryPendingAssignmentsService = async (id_delivery, authenticatedUser) => {
  const auth = resolveAuth(authenticatedUser);
  if (auth.role !== "DELIVERY") {
    throw { status: 403, message: "No tienes permiso para ver asignaciones de delivery" };
  }

  const delivery = await prisma.deliveries.findUnique({
    where: { id_delivery },
    select: { id_delivery: true, fk_user: true }
  });

  if (!delivery) {
    throw { status: 404, message: "Delivery no encontrado" };
  }

  if (delivery.fk_user !== auth.id_user) {
    throw { status: 403, message: "No tienes permiso para ver asignaciones de este delivery" };
  }

  await expireStalePendingAssignments({ fk_delivery: id_delivery });

  const pendingAssignments = await prisma.deliveryAssignments.findMany({
    where: {
      fk_delivery: id_delivery,
      delivery: { is: { fk_user: auth.id_user, status: true, delivery_status: 'ACTIVE' } },
      ...activePendingAssignmentWhere(),
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
export const getAcceptedAssignmentService = async (id_order, authenticatedUser) => {
  const auth = resolveAuth(authenticatedUser);
  if (![
    "SELLER",
    "CUSTOMER",
    "DELIVERY",
  ].includes(auth.role)) {
    throw { status: 403, message: "No tienes permiso para ver asignaciones" };
  }

  const order = await prisma.orders.findUnique({
    where: { id_order },
    select: { id_order: true, fk_store: true, fk_user: true }
  });

  if (!order) {
    throw { status: 404, message: "Pedido no encontrado" };
  }

  await ensureOrderAccess(order, auth);

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

  if (assignment.assignment_status !== "ACCEPTED") {
    throw { status: 409, message: "Solo se pueden completar asignaciones aceptadas" };
  }

  if (assignment.delivery?.fk_user !== id_user) {
    throw { status: 403, message: "No tienes permiso para completar esta asignación" };
  }

  let previousOrderStatus = null;
  const updated = await prisma.$transaction(async (tx) => {
    const order = await tx.orders.findUnique({
      where: { id_order: assignment.fk_order },
      select: { order_status: true }
    });
    previousOrderStatus = order?.order_status ?? null;

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

  logSecurityEvent("ASSIGNMENT_STATUS_CHANGED", {
    assignmentId: id_delivery_assignment,
    orderId: assignment.fk_order,
    deliveryId: assignment.fk_delivery,
    previousStatus: "ACCEPTED",
    newStatus: "DELIVERED",
    actorUserId: id_user,
  });

  logSecurityEvent("ORDER_STATUS_CHANGED", {
    orderId: assignment.fk_order,
    previousStatus: previousOrderStatus,
    newStatus: "DELIVERED",
    actorUserId: id_user,
    actorRole: "DELIVERY",
    source: "assignment_complete",
  });

  return updated;
};

export const respondToAssignmentService = async (orderId, userId, action) => {
  const parsedOrderId = Number(orderId);
  if (!Number.isInteger(parsedOrderId) || parsedOrderId <= 0) {
    throw { status: 400, message: "ID de orden inválido" };
  }

  const pendingAuditLogs = [];

  const result = await prisma.$transaction(async (tx) => {
    await expireStalePendingAssignments({ fk_order: parsedOrderId }, tx);

    const assignment = await tx.deliveryAssignments.findFirst({
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

    if (!isAssignmentResponseWindowOpen(assignment)) {
      await closePendingAndReassign(tx, assignment, "EXPIRED");
      throw { status: 409, message: "El tiempo para responder a esta asignación venció" };
    }

    if (action === "ACCEPT") {
      const updated = await tx.deliveryAssignments.update({
        where: { id_delivery_assignment: assignment.id_delivery_assignment },
        data: { assignment_status: "ACCEPTED" }
      });

      await tx.orders.update({
        where: { id_order: parsedOrderId },
        data: { order_status: "SHIPPED", delivery_unavailable: false }
      });

      pendingAuditLogs.push(
        {
          event: "ASSIGNMENT_STATUS_CHANGED",
          details: {
            assignmentId: assignment.id_delivery_assignment,
            orderId: parsedOrderId,
            deliveryId: assignment.fk_delivery,
            previousStatus: "PENDING",
            newStatus: "ACCEPTED",
            actorUserId: userId,
          },
        },
        {
          event: "ORDER_STATUS_CHANGED",
          details: {
            orderId: parsedOrderId,
            previousStatus: assignment.order?.order_status ?? null,
            newStatus: "SHIPPED",
            actorUserId: userId,
            actorRole: "DELIVERY",
            source: "assignment_accept",
          },
        }
      );

      return updated;
    }

    const outcome = await closePendingAndReassign(tx, assignment, "REJECTED", { reason: "reject" });

    if (outcome.reassigned) {
      pendingAuditLogs.push({
        event: "ASSIGNMENT_STATUS_CHANGED",
        details: {
          assignmentId: assignment.id_delivery_assignment,
          orderId: parsedOrderId,
          deliveryId: assignment.fk_delivery,
          previousStatus: "PENDING",
          newStatus: "REJECTED",
          actorUserId: userId,
          reassigned: true,
          newAssignmentId: outcome.assignment?.id_delivery_assignment ?? null,
        },
      });

      return {
        ...outcome.assignment,
        reassigned: true,
        delivery_unavailable: false,
      };
    }

    pendingAuditLogs.push({
      event: "ASSIGNMENT_STATUS_CHANGED",
      details: {
        assignmentId: assignment.id_delivery_assignment,
        orderId: parsedOrderId,
        deliveryId: assignment.fk_delivery,
        previousStatus: "PENDING",
        newStatus: "REJECTED",
        actorUserId: userId,
        reassigned: false,
      },
    });

    return {
      assignment_status: "REJECTED",
      fk_order: parsedOrderId,
      reassigned: false,
      delivery_unavailable: true,
    };
  });

  for (const { event, details } of pendingAuditLogs) {
    logSecurityEvent(event, details);
  }

  return result;
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

  let dateFilter = undefined;
  if (period && period !== "all") {
    const now = new Date();
    const daysMap = { "7d": 7, "15d": 15, "1m": 30 };
    const days = daysMap[period];
    const from = new Date(now);
    from.setDate(from.getDate() - days);
    dateFilter = { gte: from };
  }

  const assignmentWhere = {
    fk_delivery: parsedDeliveryId,
    status: true,
    ...(assignment_status
      ? { assignment_status }
      : { assignment_status: { notIn: ["PENDING", "EXPIRED"] } }),
    ...(dateFilter && { created_at: dateFilter }),
    ...(orderId !== undefined && { fk_order: orderId }),
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
