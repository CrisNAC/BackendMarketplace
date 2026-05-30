//delivery.service.js
import { prisma } from '../../../lib/prisma.js';
import {
  activePendingAssignmentWhere,
  closePendingAndReassign,
  expireStalePendingAssignments,
} from '../delivery-assignments/delivery-assignment-workflow.service.js';
import { upsertUserImage } from '../../images/services/user-image.service.js';
import { validateDeliveryPhone } from '../../../lib/phone.js';

// Registrar delivery con usuario autenticado
export const registerDeliveryService = async (authUser, data) => {
  const { vehicleType, phone } = data;

  const user = await prisma.users.findUnique({
    where: { id_user: authUser.id_user },
    include: { delivery: true }
  });

  if (!user) {
    throw { status: 404, message: "Usuario no encontrado" };
  }

  if (user.role === 'DELIVERY' || user.delivery) {
    throw { status: 409, message: "El usuario ya está registrado como delivery" };
  }

  if (user.role !== 'CUSTOMER') {
    throw { status: 403, message: "Solo un usuario CUSTOMER puede registrarse como delivery" };
  }

  const userUpdateData = { role: "DELIVERY" };
  if (phone !== undefined) {
    userUpdateData.phone = validateDeliveryPhone(phone);
  } else if (user.phone) {
    userUpdateData.phone = user.phone;
  } else {
    throw {
      status: 400,
      message: "El teléfono es obligatorio para registrarse como delivery",
    };
  }

  const [updatedUser, delivery] = await prisma.$transaction([
    prisma.users.update({
      where: { id_user: user.id_user },
      data: userUpdateData,
      select: {
        id_user: true,
        name: true,
        email: true,
        phone: true,
        role: true
      }
    }),
    prisma.deliveries.create({
      data: {
        fk_user: user.id_user,
        fk_store: null,
        delivery_status: "INACTIVE",
        vehicle_type: vehicleType
      },
      select: {
        id_delivery: true,
        fk_user: true,
        fk_store: true,
        delivery_status: true,
        vehicle_type: true,
        status: true
      }
    })
  ]);

  return { user: updatedUser, delivery };
};



// Actualizar status del delivery
export const updateDeliveryStatusService = async (authenticatedUserId, id_delivery, nuevoStatus) => {
  const delivery = await prisma.deliveries.findUnique({
    where: { id_delivery }
  });

  if (!delivery) {
    throw { status: 404, message: "Delivery no encontrado" };
  }

  if (delivery.fk_user !== authenticatedUserId) {
    throw { status: 403, message: "No tienes permiso para actualizar este delivery" };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const deliveryRow = await tx.deliveries.update({
      where: { id_delivery },
      data: { delivery_status: nuevoStatus },
    });

    if (nuevoStatus === "INACTIVE") {
      await expireStalePendingAssignments({ fk_delivery: id_delivery }, tx);

      const pendingAssignments = await tx.deliveryAssignments.findMany({
        where: {
          fk_delivery: id_delivery,
          ...activePendingAssignmentWhere(),
        },
        include: {
          order: { select: { id_order: true, fk_store: true } },
        },
      });

      for (const assignment of pendingAssignments) {
        await closePendingAndReassign(tx, assignment, "REJECTED", { reason: "offline" });
      }
    }

    return deliveryRow;
  });

  return updated;
};

// Obtener asignaciones pendientes del delivery
export const getPendingAssignmentsService = async (id_delivery, authUserId) => {
  await expireStalePendingAssignments({ fk_delivery: id_delivery });

  const delivery = await prisma.deliveries.findFirst({
    where: {
      id_delivery,
      status: true,
      ...(authUserId != null ? { fk_user: authUserId } : {})
    },
    include: {
      user: { select: { id_user: true, name: true, email: true } },
      store: { select: { id_store: true, name: true, store_status: true } },
      delivery_assignments: {
        where: activePendingAssignmentWhere(),
        include: {
          order: {
            select: {
              id_order: true,
              total: true,
              fk_address: true,
              order_status: true,
              shipping_cost: true,
              shipping_distance_km: true,
              created_at: true,
              address: {
                select: {
                  id_address: true,
                  address: true,
                  city: true,
                  region: true
                }
              },
              user: {
                select: {
                  id_user: true,
                  name: true,
                  phone: true,
                  avatar_url: true
                }
              },
              store: {
                select: {
                  id_store: true,
                  name: true,
                  store_status: true
                }
              },
              order_items: {
                where: { status: true },
                select: {
                  quantity: true,
                  product: { select: { name: true } }
                }
              }
            }
          }
        },
        orderBy: { created_at: "desc" }
      }
    }
  });

  if (!delivery) {
    throw { status: 404, message: "Delivery no encontrado" };
  }

  return delivery;
};


// Obtener datos completos del delivery
export const getDeliveryByIdService = async (id_delivery) => {
  const delivery = await prisma.deliveries.findUnique({
    where: { id_delivery },
    include: {
      user: {
        select: {
          id_user: true,
          name: true,
          email: true,
          phone: true,
          avatar_url: true
        }
      },
      store: {
        select: {
          id_store: true,
          name: true
        }
      },
      delivery_assignments: {
        select: {
          id_delivery_assignment: true,
          assignment_status: true,
          assignment_sequence: true,
          created_at: true
        },
        orderBy: { created_at: 'desc' },
        take: 10
      }
    }
  });

  if (!delivery) {
    throw { status: 404, message: "Delivery no encontrado" };
  }

  return delivery;
};


// Actualizar perfil de delivery (nombre, teléfono, tipo de vehículo y avatar)
export const updateDeliveryProfileService = async (id_delivery, authUser, data, file) => {
  const deliveryId = Number(id_delivery);
  
  const delivery = await prisma.deliveries.findUnique({
    where: { id_delivery: deliveryId },
    include: { user: true }
  });

  if (!delivery) {
    throw { status: 404, message: "Delivery no encontrado" };
  }

  // Verificar que sea el dueño
  if (delivery.fk_user !== authUser.id_user && authUser.role !== 'ADMIN') {
    throw { status: 403, message: "No tienes permiso para actualizar este perfil de delivery" };
  }

  const { name, phone, vehicleType } = data;
  const normalizedPhone = phone !== undefined ? validateDeliveryPhone(phone) : undefined;
  let avatarUrl = delivery.user.avatar_url;

  // Si envían un archivo de imagen, usar upsertUserImage
  if (file) {
    try {
      avatarUrl = await upsertUserImage(delivery.fk_user, file, authUser);
    } catch (error) {
      if (error.statusCode) throw { status: error.statusCode, message: error.message };
      throw { status: 500, message: `Error al subir imagen: ${error.message}` };
    }
  }

  // Actualizar Users y Deliveries en una sola transacción para evitar estados parciales
  const hasUserChanges = name || normalizedPhone !== undefined;
  const hasDeliveryChanges = vehicleType !== undefined;

  if (hasUserChanges || hasDeliveryChanges) {
    await prisma.$transaction(async (tx) => {
      if (hasUserChanges) {
        await tx.users.update({
          where: { id_user: delivery.fk_user },
          data: {
            ...(name && { name }),
            ...(normalizedPhone !== undefined && { phone: normalizedPhone })
          }
        });
      }

      if (hasDeliveryChanges) {
        await tx.deliveries.update({
          where: { id_delivery: deliveryId },
          data: { vehicle_type: vehicleType }
        });
      }
    });
  }

  // Obtener delivery actualizado para devolverlo
  const updatedDelivery = await prisma.deliveries.findUnique({
    where: { id_delivery: deliveryId },
    include: {
      user: {
        select: { name: true, phone: true, avatar_url: true, email: true }
      }
    }
  });

  return updatedDelivery;
};
