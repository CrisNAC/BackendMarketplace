import { prisma } from "../../../lib/prisma.js";
import { createNotificationService } from "../../notifications/notification.service.js";
import { NOTIFICATION_MESSAGES } from "../../notifications/notification.constant.js";
import { DELIVERY_ASSIGNMENT_RESPONSE } from "../../../utils/contants/delivery-assignment.constant.js";

export function computeAssignmentResponseDeadline(now = new Date()) {
  const minMs = DELIVERY_ASSIGNMENT_RESPONSE.MIN_MINUTES * 60 * 1000;
  const maxMs = DELIVERY_ASSIGNMENT_RESPONSE.MAX_MINUTES * 60 * 1000;
  const span = maxMs - minMs;
  const offset = minMs + Math.floor(Math.random() * (span + 1));
  return new Date(now.getTime() + offset);
}

export function isAssignmentResponseWindowOpen(assignment, now = new Date()) {
  if (!assignment || assignment.assignment_status !== "PENDING" || assignment.status === false) {
    return false;
  }
  if (!assignment.response_deadline) {
    return true;
  }
  return new Date(assignment.response_deadline).getTime() > now.getTime();
}

export const activePendingAssignmentWhere = (now = new Date()) => ({
  assignment_status: "PENDING",
  status: true,
  OR: [{ response_deadline: null }, { response_deadline: { gt: now } }],
});

export async function getTriedDeliveryIdsForOrder(fk_order, tx = prisma) {
  const rows = await tx.deliveryAssignments.findMany({
    where: { fk_order, status: true },
    select: { fk_delivery: true },
  });
  return [...new Set(rows.map((row) => row.fk_delivery))];
}

export async function findNextActiveDeliveryForOrder(fk_store, excludeDeliveryIds, tx = prisma) {
  const now = new Date();
  return tx.deliveries.findFirst({
    where: {
      fk_store,
      delivery_status: "ACTIVE",
      status: true,
      ...(excludeDeliveryIds.length > 0 ? { id_delivery: { notIn: excludeDeliveryIds } } : {}),
      delivery_assignments: {
        none: activePendingAssignmentWhere(now),
      },
    },
  });
}

async function notifyStoreOwner(tx, fk_store, messageKey, fk_order) {
  const store = await tx.stores.findUnique({
    where: { id_store: fk_store },
    select: { fk_user: true },
  });

  if (!store?.fk_user) return;

  const { title, message, reference_id } = NOTIFICATION_MESSAGES[messageKey](fk_order);

  await createNotificationService(tx, {
    userId: store.fk_user,
    title,
    message,
    reference_id,
  });
}

async function notifyStoreNoDeliveryAvailable(tx, fk_order, fk_store) {
  await notifyStoreOwner(tx, fk_store, "ORDER_NO_DELIVERY_AVAILABLE", fk_order);
}

/**
 * Cierra una asignación PENDING (REJECTED | EXPIRED) e intenta reasignar otro delivery ACTIVE.
 */
export async function closePendingAndReassign(tx, assignment, terminalStatus, options = {}) {
  if (!["REJECTED", "EXPIRED"].includes(terminalStatus)) {
    throw new Error(`Estado terminal inválido: ${terminalStatus}`);
  }

  await tx.deliveryAssignments.update({
    where: { id_delivery_assignment: assignment.id_delivery_assignment },
    data: { assignment_status: terminalStatus },
  });

  const fk_order = assignment.fk_order;
  let fk_store = assignment.order?.fk_store;

  if (!fk_store) {
    const order = await tx.orders.findUnique({
      where: { id_order: fk_order },
      select: { fk_store: true },
    });
    fk_store = order?.fk_store;
  }

  if (!fk_store) {
    return { reassigned: false, delivery_unavailable: true };
  }

  const triedIds = await getTriedDeliveryIdsForOrder(fk_order, tx);
  const nextDelivery = await findNextActiveDeliveryForOrder(fk_store, triedIds, tx);

  if (nextDelivery) {
    const lastAssignment = await tx.deliveryAssignments.findFirst({
      where: { fk_order },
      orderBy: { assignment_sequence: "desc" },
      select: { assignment_sequence: true },
    });

    const created = await tx.deliveryAssignments.create({
      data: {
        fk_order,
        fk_delivery: nextDelivery.id_delivery,
        assignment_status: "PENDING",
        assignment_sequence: (lastAssignment?.assignment_sequence || 0) + 1,
        status: true,
        response_deadline: computeAssignmentResponseDeadline(),
        assigned_at: new Date(),
      },
    });

    await tx.orders.update({
      where: { id_order: fk_order },
      data: { delivery_unavailable: false },
    });

    if (terminalStatus === "REJECTED") {
      const messageKey = options.reason === "offline"
        ? "ORDER_DELIVERY_OFFLINE"
        : "ORDER_DELIVERY_REJECTED";
      await notifyStoreOwner(tx, fk_store, messageKey, fk_order);
    }

    return { reassigned: true, assignment: created };
  }

  await tx.orders.update({
    where: { id_order: fk_order },
    data: { delivery_unavailable: true },
  });

  if (terminalStatus === "REJECTED") {
    if (options.reason === "offline") {
      await notifyStoreOwner(tx, fk_store, "ORDER_DELIVERY_OFFLINE", fk_order);
    } else {
      await notifyStoreNoDeliveryAvailable(tx, fk_order, fk_store);
    }
  } else {
    await notifyStoreNoDeliveryAvailable(tx, fk_order, fk_store);
  }

  return { reassigned: false, delivery_unavailable: true };
}

export async function createPendingAssignmentForOrder(tx, { fk_order, fk_delivery }) {
  const lastAssignment = await tx.deliveryAssignments.findFirst({
    where: { fk_order },
    orderBy: { assignment_sequence: "desc" },
    select: { assignment_sequence: true },
  });

  const created = await tx.deliveryAssignments.create({
    data: {
      fk_order,
      fk_delivery,
      assignment_status: "PENDING",
      assignment_sequence: (lastAssignment?.assignment_sequence || 0) + 1,
      status: true,
      response_deadline: computeAssignmentResponseDeadline(),
      assigned_at: new Date(),
    },
  });

  await tx.orders.update({
    where: { id_order: fk_order },
    data: { delivery_unavailable: false },
  });

  return created;
}

export async function expireStalePendingAssignments(filter = {}, tx = prisma) {
  const now = new Date();
  const legacyCutoff = new Date(
    now.getTime() - DELIVERY_ASSIGNMENT_RESPONSE.MAX_MINUTES * 60 * 1000
  );

  const stale = await tx.deliveryAssignments.findMany({
    where: {
      assignment_status: "PENDING",
      status: true,
      ...filter,
      OR: [
        { response_deadline: { lte: now } },
        {
          response_deadline: null,
          assigned_at: { lte: legacyCutoff },
        },
      ],
    },
    include: {
      order: {
        select: { id_order: true, fk_store: true, order_status: true },
      },
    },
  });

  const results = [];
  for (const assignment of stale) {
    const result = await closePendingAndReassign(tx, assignment, "EXPIRED");
    results.push({ assignmentId: assignment.id_delivery_assignment, ...result });
  }

  return results;
}
