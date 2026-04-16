import { prisma } from "../../../lib/prisma.js";

/**
 * Aprueba un comercio cambiando su store_status de INACTIVE a ACTIVE.
 * También actualiza la visibilidad de todos sus productos.
 */
export const approveStoreService = async (storeId) => {
  const id = Number(storeId);
  if (!Number.isInteger(id) || id <= 0) {
    throw { status: 400, message: "ID de comercio inválido" };
  }

  const store = await prisma.stores.findUnique({
    where: { id_store: id },
    select: { id_store: true, name: true, store_status: true, status: true }
  });

  if (!store || !store.status) {
    throw { status: 404, message: "Comercio no encontrado" };
  }

  if (store.store_status === "ACTIVE") {
    throw { status: 400, message: "El comercio ya está aprobado" };
  }

  await prisma.$transaction([
    prisma.stores.update({
      where: { id_store: id },
      data: { store_status: "ACTIVE" }
    }),
    // Al aprobar, hacer visibles todos los productos activos del comercio
    prisma.products.updateMany({
      where: { fk_store: id, status: true },
      data: { visible: true }
    })
  ]);

  const updated = await prisma.stores.findUnique({
    where: { id_store: id },
    select: { id_store: true, name: true, store_status: true, status: true }
  });

  return updated;
};

/**
 * Lista comercios pendientes de aprobación (store_status = INACTIVE, status = true).
 */
export const getPendingStoresService = async (pagination) => {
  const { page, limit, skip } = pagination;

  const where = {
    store_status: "INACTIVE",
    status: true
  };

  const [total, stores] = await Promise.all([
    prisma.stores.count({ where }),
    prisma.stores.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id_store: true,
        name: true,
        email: true,
        phone: true,
        description: true,
        logo: true,
        store_status: true,
        status: true,
        created_at: true,
        user: {
          select: {
            id_user: true,
            name: true,
            email: true,
          }
        },
        store_category: {
          select: { id_store_category: true, name: true }
        }
      }
    })
  ]);

  return {
    data: stores,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  };
};
