//delivery.service.js
import { prisma } from '../../../lib/prisma.js';
import bcrypt from 'bcrypt';
import { generateToken } from '../../../config/jwt.config.js';

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
    data: { name, email, password_hash, phone, role: "DELIVERY" }
  });
  
  return newUser;
};

// Login delivery
export const loginDeliveryService = async (email, password) => {
  const user = await prisma.users.findUnique({
    where: { email }
  });
  
  if (!user) {
    throw { status: 404, message: "Usuario no encontrado" };
  }
  
  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  
  if (!passwordMatch) {
    throw { status: 401, message: "Contraseña incorrecta" };
  }
  
  const token = generateToken({
    id_user: user.id_user,
    role: user.role
  });
  
  return {
    token,
    user: { id_user: user.id_user, name: user.name, email: user.email, role: user.role }
  };
};

// Crear delivery (asignar a tienda)
export const createDeliveryService = async (data) => {
  const { fk_user, fk_store, delivery_status, status } = data;
  
  // Verificar que el usuario existe
  const user = await prisma.users.findUnique({ 
    where: { id_user: fk_user } 
  });
  
  if (!user) {
    throw { status: 404, message: "Usuario no encontrado" };
  }

  // Verificar que la tienda existe
  const store = await prisma.stores.findUnique({ 
    where: { id_store: fk_store } 
  });
  
  if (!store) {
    throw { status: 404, message: "Tienda no encontrada" };
  }
  
  // Crear el delivery
  const newDelivery = await prisma.deliveries.create({
    data: {
      fk_user,
      fk_store,
      delivery_status: delivery_status || "ACTIVE", // ✅ ACTUALIZADO
      status: status !== false
    }
  });
  
  return newDelivery;
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

// Editar delivery
export const updateDeliveryService = async (id_user, data) => {
  const { name, email, phone, avatar_url } = data;
  
  // Verificar que el usuario existe y es delivery
  const user = await prisma.users.findUnique({
    where: { id_user }
  });
  
  if (!user) {
    throw { status: 404, message: "Usuario no encontrado" };
  }
  
  if (user.role !== "DELIVERY") {
    throw { status: 403, message: "El usuario no es un delivery" };
  }
  
  // Si cambia email, verificar que no esté en uso
  if (email) {
    const existingUser = await prisma.users.findUnique({
      where: { email }
    });
    
    if (existingUser && existingUser.id_user !== id_user) {
      throw { status: 409, message: "Email ya registrado" };
    }
  }
  
  // Construir datos a actualizar
  const dataToUpdate = {};
  if (name) dataToUpdate.name = name;
  if (email) dataToUpdate.email = email;
  if (phone) dataToUpdate.phone = phone;
  if (avatar_url !== undefined) dataToUpdate.avatar_url = avatar_url;
  
  // Actualizar usuario
  const updatedUser = await prisma.users.update({
    where: { id_user },
    data: dataToUpdate,
    select: {
      id_user: true,
      name: true,
      email: true,
      phone: true,
      avatar_url: true,
      role: true
    }
  });
  
  return updatedUser;
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
        take: 10  // Últimas 10 asignaciones
      }
    }
  });
  
  if (!delivery) {
    throw { status: 404, message: "Delivery no encontrado" };
  }
  
  return delivery;
};

// Obtener todos los deliveries de una tienda
export const getStoreDeliveriesService = async (id_store) => {
  const store = await prisma.stores.findUnique({
    where: { id_store }
  });
  
  if (!store) {
    throw { status: 404, message: "Tienda no encontrada" };
  }
  
  const deliveries = await prisma.deliveries.findMany({
    where: { fk_store: id_store },
    include: {
      user: {
        select: { id_user: true, name: true, email: true, phone: true }
      }
    },
    orderBy: { created_at: 'desc' }
  });
  
  return deliveries;
};

// Obtener deliveries disponibles de una tienda
export const getAvailableDeliveriesService = async (id_store) => {
  const store = await prisma.stores.findUnique({
    where: { id_store }
  });
  
  if (!store) {
    throw { status: 404, message: "Tienda no encontrada" };
  }
  
  const availableDeliveries = await prisma.deliveries.findMany({
    where: {
      fk_store: id_store,
      delivery_status: "ACTIVE", // ✅ ACTUALIZADO
      status: true
    },
    include: {
      user: {
        select: { id_user: true, name: true, phone: true }
      }
    },
    orderBy: { created_at: 'asc' }
  });
  
  return availableDeliveries;
};

// Estadísticas del delivery
export const getDeliveryStatsService = async (id_delivery) => {
  const delivery = await prisma.deliveries.findUnique({
    where: { id_delivery }
  });
  
  if (!delivery) {
    throw { status: 404, message: "Delivery no encontrado" };
  }
  
  const totalAssignments = await prisma.deliveryAssignments.count({
    where: { fk_delivery: id_delivery }
  });
  
  // Cantidad de asignaciones aceptadas
  const acceptedAssignments = await prisma.deliveryAssignments.count({
    where: {
      fk_delivery: id_delivery,
      assignment_status: "ACCEPTED"
    }
  });
  
  // Cantidad de asignaciones rechazadas
  const rejectedAssignments = await prisma.deliveryAssignments.count({
    where: {
      fk_delivery: id_delivery,
      assignment_status: "REJECTED"
    }
  });
  
  // Cantidad de asignaciones en pendiente
  const pendingAssignments = await prisma.deliveryAssignments.count({
    where: {
      fk_delivery: id_delivery,
      assignment_status: "PENDING"
    }
  });
  
  return {
    delivery_id: id_delivery,
    total_assignments: totalAssignments,
    accepted: acceptedAssignments,
    rejected: rejectedAssignments,
    pending: pendingAssignments,
    acceptance_rate: totalAssignments > 0 ? ((acceptedAssignments / totalAssignments) * 100).toFixed(2) + '%' : '0%' // Porcentaje de asignaciones que el delivery aceptó
  };
};

// Eliminar delivery (borrado lógico)
export const deleteDeliveryService = async (id_delivery) => {
  const delivery = await prisma.deliveries.findUnique({
    where: { id_delivery }
  });
  
  if (!delivery) {
    throw { status: 404, message: "Delivery no encontrado" };
  }
  
  // Verificar que no hay asignaciones PENDING activas
  const pendingAssignments = await prisma.deliveryAssignments.count({
    where: {
      fk_delivery: id_delivery,
      assignment_status: "PENDING"
    }
  });
  
  if (pendingAssignments > 0) {
    throw { status: 409, message: "No se puede eliminar: hay asignaciones pendientes" };
  }
  
  // Borrado lógico
  const deleted = await prisma.deliveries.update({
    where: { id_delivery },
    data: { status: false }
  });
  
  return { message: "Delivery eliminado" };
};

// Obtener asignaciones activas (ACCEPTED) de un delivery
export const getActiveAssignmentsService = async (id_delivery) => {
  const delivery = await prisma.deliveries.findUnique({
    where: { id_delivery }
  });
  
  if (!delivery) {
    throw { status: 404, message: "Delivery no encontrado" };
  }
  
  const activeAssignments = await prisma.deliveryAssignments.findMany({
    where: {
      fk_delivery: id_delivery,
      assignment_status: "ACCEPTED"
    },
    include: {
      order: {
        select: {
          id_order: true,
          total: true,
          fk_address: true,
          created_at: true,
          address: {
            select: { address: true, city: true, region: true }
          }
        }
      }
    },
    orderBy: { created_at: 'asc' }
  });
  
  return activeAssignments;
};