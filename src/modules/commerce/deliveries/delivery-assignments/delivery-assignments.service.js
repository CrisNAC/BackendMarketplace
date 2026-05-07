// src/modules/commerce/deliveries/delivery-assignments/delivery-assignments.service.js

import { prisma } from "../../../../lib/prisma.js";
import { getAuthorizedStoreOwnerService } from "../../commerces/store.service.js";
import { NotFoundError, ValidationError } from "../../../../lib/errors.js";

/**
 * Devuelve los deliveries ACTIVE de la tienda disponibles para tomar el pedido,
 * EXCLUYENDO aquellos que ya tienen asignaciones PENDING o ACCEPTED activas.
 * También devuelve la dirección de entrega del pedido (si tiene).
 *
 * GET /api/stores/:storeId/orders/:orderId/deliveries
 */
export const getAvailableDeliveriesForOrderService = async (
  authenticatedUserId,
  storeIdStr,
  orderIdStr
) => {
  // Verificar que el comercio existe y pertenece al usuario autenticado
  const store = await getAuthorizedStoreOwnerService(authenticatedUserId, storeIdStr);

  const orderId = Number(orderIdStr);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    throw new ValidationError("ID de pedido inválido");
  }

  // Verificar que el pedido existe y pertenece a esta tienda
  const order = await prisma.orders.findFirst({
    where: {
      id_order: orderId,
      fk_store: store.id_store,
      status: true
    },
    select: {
      id_order: true,
      order_status: true,
      fk_address: true,
      address: {
        select: {
          address: true,
          city: true,
          region: true,
          postal_code: true
        }
      }
    }
  });

  if (!order) {
    throw new NotFoundError("Pedido no encontrado");
  }

  // Solo se pueden delegar pedidos en estado PENDING o PROCESSING
  const DELEGABLE_STATUSES = ["PENDING", "PROCESSING"];
  if (!DELEGABLE_STATUSES.includes(order.order_status)) {
    throw new ValidationError(
      `Solo se pueden delegar pedidos en estado ${DELEGABLE_STATUSES.join(" o ")}. Estado actual: ${order.order_status}`
    );
  }

  // Verificar que no tenga ya una asignación PENDING o ACCEPTED activa
  const existingAssignment = await prisma.deliveryAssignments.findFirst({
    where: {
      fk_order: orderId,
      assignment_status: { in: ["PENDING", "ACCEPTED"] },
      status: true
    }
  });

  if (existingAssignment) {
    throw new ValidationError("Este pedido ya tiene una asignación activa");
  }

  // Obtener IDs de deliveries que tienen asignaciones PENDING o ACCEPTED
  const busyDeliveries = await prisma.deliveryAssignments.findMany({
    where: {
      assignment_status: { in: ["PENDING", "ACCEPTED"] },
      status: true,
      delivery: {
        fk_store: store.id_store
      }
    },
    select: {
      fk_delivery: true
    }
  });

  const busyDeliveryIds = new Set(busyDeliveries.map(d => d.fk_delivery));

  // Obtener deliveries ACTIVE de la tienda que NO estén ocupados
  const deliveries = await prisma.deliveries.findMany({
    where: {
      fk_store: store.id_store,
      delivery_status: "ACTIVE",
      status: true
    },
    select: {
      id_delivery: true,
      user: {
        select: {
          id_user: true,
          name: true,
          phone: true,
          avatar_url: true
        }
      }
    }
  });

  // Filtrar deliveries que estén ocupados
  const availableDeliveries = deliveries.filter(
    d => !busyDeliveryIds.has(d.id_delivery)
  );

  return {
    order_id: orderId,
    order_status: order.order_status,
    // null si el pedido es retiro en tienda (pickup)
    delivery_address: order.address
      ? {
          address: order.address.address,
          city: order.address.city,
          region: order.address.region,
          postal_code: order.address.postal_code ?? null
        }
      : null,
    available_deliveries: availableDeliveries.map((d) => ({
      id_delivery: d.id_delivery,
      name: d.user.name,
      phone: d.user.phone,
      avatar_url: d.user.avatar_url
    }))
  };
};