//delivery.service.js
import { prisma } from '../../../lib/prisma.js';
import bcrypt from 'bcrypt';


const SALT_ROUNDS = 10;

// Registrar delivery
export const registerDeliveryService = async (data) => {
  const { name, email, password, phone } = data;

  const existingUser = await prisma.users.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw { status: 409, message: "Email ya registrado" };
  }

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

  const newUser = await prisma.users.create({
    data: { name, email, password_hash, phone, role: "DELIVERY" },
    select: {
      id_user: true,
      name: true,
      email: true,
      phone: true,
      role: true
    }
  });

  return newUser;
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

  const updated = await prisma.deliveries.update({
    where: { id_delivery },
    data: { delivery_status: nuevoStatus }
  });

  return updated;
};

// Obtener asignaciones pendientes del delivery
export const getPendingAssignmentsService = async (id_delivery) => {
  const delivery = await prisma.deliveries.findUnique({
    where: { id_delivery },
    include: {
      user: { select: { id_user: true, name: true, email: true } },
      store: { select: { id_store: true, name: true } },
      delivery_assignments: {
        where: { assignment_status: "PENDING" },
        include: {
          order: {
            select: { id_order: true, total: true, fk_address: true }
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

