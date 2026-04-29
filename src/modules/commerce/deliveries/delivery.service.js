import { prisma } from "../../../lib/prisma.js";
import { ConflictError, NotFoundError } from "../../../lib/errors.js";
import { getAuthorizedStoreOwnerService } from "../commerces/store.service.js";

export const searchDeliveryCandidatesService = async (query) => {
  if (!query) return [];

  const candidates = await prisma.users.findMany({
    where: {
      role: 'DELIVERY',
      status: true,
      OR: [
        { email: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query, mode: 'insensitive' } }
      ],
      delivery: null
    },
    select: {
      id_user: true,
      name: true,
      email: true,
      phone: true
    }
  });

  return candidates;
};

export const createDeliveryService = async (authenticatedUserId, storeIdStr, deliveryUserIdStr) => {
  const store = await getAuthorizedStoreOwnerService(authenticatedUserId, storeIdStr);
  const deliveryUserId = Number(deliveryUserIdStr);

  const user = await prisma.users.findFirst({
    where: { id_user: deliveryUserId, role: 'DELIVERY', status: true }
  });

  if (!user) {
    throw new NotFoundError("Candidato a delivery no encontrado o no válido");
  }

  const existing = await prisma.deliveries.findUnique({
    where: { fk_user: deliveryUserId }
  });

  if (existing) {
    if (existing.fk_store === store.id_store) {
      throw new ConflictError("El delivery ya está vinculado a este comercio");
    }
    throw new ConflictError("El delivery ya está vinculado a un comercio");
  }

  const delivery = await prisma.deliveries.create({
    data: {
      fk_store: store.id_store,
      fk_user: deliveryUserId,
      delivery_status: 'INACTIVE'
    }
  });

  return delivery;
};
