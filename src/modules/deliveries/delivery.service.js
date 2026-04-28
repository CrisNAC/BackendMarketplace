import { prisma } from "../../lib/prisma.js";
import { ForbiddenError, NotFoundError, ValidationError } from "../../lib/errors.js";

const ALLOWED_DELIVERY_STATUSES = ["ACTIVE", "INACTIVE"];

const parsePositiveInt = (value, fieldName) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ValidationError(`${fieldName} debe ser un entero positivo`);
  }
  return parsed;
};

export const updateDeliveryStatusService = async (authenticatedUserId, deliveryId, delivery_status) => {
  const userId = parsePositiveInt(authenticatedUserId, "authenticatedUserId");
  const parsedDeliveryId = parsePositiveInt(deliveryId, "deliveryId");
  const normalizedStatus = typeof delivery_status === "string" ? delivery_status.trim().toUpperCase() : "";

  if (!ALLOWED_DELIVERY_STATUSES.includes(normalizedStatus)) {
    throw new ValidationError("delivery_status debe ser ACTIVE o INACTIVE");
  }

  const delivery = await prisma.deliveries.findUnique({
    where: { id_delivery: parsedDeliveryId },
    select: {
      id_delivery: true,
      fk_user: true,
      delivery_status: true,
      status: true
    }
  });

  if (!delivery || !delivery.status) {
    throw new NotFoundError("Delivery no encontrado");
  }

  if (delivery.fk_user !== userId) {
    throw new ForbiddenError("No tienes permiso para actualizar este delivery");
  }

  const updatedDelivery = await prisma.deliveries.update({
    where: { id_delivery: parsedDeliveryId },
    data: { delivery_status: normalizedStatus },
    select: {
      id_delivery: true,
      delivery_status: true,
      status: true,
      updated_at: true
    }
  });

  return {
    id_delivery: updatedDelivery.id_delivery,
    delivery_status: updatedDelivery.delivery_status,
    status: updatedDelivery.status,
    updatedAt: updatedDelivery.updated_at
  };
};