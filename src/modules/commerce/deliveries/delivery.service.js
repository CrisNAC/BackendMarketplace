import { prisma } from "../../../lib/prisma.js";
import { ConflictError, NotFoundError, ValidationError } from "../../../lib/errors.js";
import { getAuthorizedStoreOwnerService } from "../commerces/store.service.js";

const deliveryCandidateSelect = {
  id_user: true,
  name: true,
  email: true,
  phone: true
};

/** Disponible para vincular a un comercio: sin fila Deliveries, o con fila pero sin tienda (fk_store null). */
const deliveryCandidateAvailability = {
  OR: [{ delivery: null }, { delivery: { fk_store: null } }]
};

/**
 * Sin `q`: todos los repartidores disponibles para vincular.
 * Con `q`: filtro por correo o teléfono (insensible a mayúsculas).
 */
export const searchDeliveryCandidatesService = async (query) => {
  const trimmed = typeof query === 'string' ? query.trim() : '';

  if (!trimmed) {
    return prisma.users.findMany({
      where: {
        role: 'DELIVERY',
        status: true,
        ...deliveryCandidateAvailability
      },
      select: deliveryCandidateSelect,
      orderBy: { name: 'asc' }
    });
  }

  return prisma.users.findMany({
    where: {
      role: 'DELIVERY',
      status: true,
      AND: [
        deliveryCandidateAvailability,
        {
          OR: [
            { email: { contains: trimmed, mode: 'insensitive' } },
            { phone: { contains: trimmed, mode: 'insensitive' } }
          ]
        }
      ]
    },
    select: deliveryCandidateSelect,
    orderBy: { name: 'asc' }
  });
};

export const createDeliveryService = async (authenticatedUserId, storeIdStr, deliveryUserIdStr) => {
  const store = await getAuthorizedStoreOwnerService(authenticatedUserId, storeIdStr);
  const deliveryUserId = Number(deliveryUserIdStr);
  
  if (!Number.isInteger(deliveryUserId) || deliveryUserId <= 0) {
    throw new ValidationError("El ID del candidato a delivery debe ser un número entero positivo");
  }

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
    if (existing.fk_store != null) {
      throw new ConflictError("El delivery ya está vinculado a un comercio");
    }

    return prisma.deliveries.update({
      where: { fk_user: deliveryUserId },
      data: { fk_store: store.id_store }
    });
  }

  try {
    return await prisma.deliveries.create({
      data: {
        fk_store: store.id_store,
        fk_user: deliveryUserId,
        delivery_status: 'INACTIVE'
      }
    });
  } catch (error) {
    if (error.code === 'P2002') {
      const row = await prisma.deliveries.findUnique({
        where: { fk_user: deliveryUserId }
      });
      
      if (row && row.fk_store === store.id_store) {
        throw new ConflictError("El delivery ya está vinculado a este comercio");
      }
      throw new ConflictError("El delivery ya está vinculado a un comercio");
    }
    throw error;
  }
};
