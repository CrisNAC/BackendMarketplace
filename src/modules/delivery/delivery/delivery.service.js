//delivery.service.js
import { prisma } from '../../../lib/prisma.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const SALT_ROUNDS = 10;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

//validar entero positivo
const parsePositiveInteger = (value, fieldName) => {
  const parsedValue = Number(value);
  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw { status: 400, message: `${fieldName} inválido` };
  }
  return parsedValue;
};

//Registrar delivery
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
    data: {name, email, password_hash, phone, role: "DELIVERY"}
  })
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
  
  // Verificar contraseña
  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  
  if (!passwordMatch) {
    throw { status: 401, message: "Contraseña incorrecta" };
  }
  
  // Generar JWT token
  const token = jwt.sign(
    { id_user: user.id_user, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );
  
  return {
    token,
    user: {id_user: user.id_user, name: user.name, email: user.email, role: user.role }
  };
};

// crear delivery
export const createDeliveryService = async (data) => {
  const { fk_user, fk_store, delivery_status, status } = data;
  
  //verificar que el usuario existe
  const user = await prisma.users.findUnique({ where: { id_user: fk_user }});
  if (!user) { throw { status: 404, message: "Usuario no encontrado" };}

  // Verificar que la tienda existe
  const store = await prisma.stores.findUnique({ where: { id_store: fk_store } });
  
  if (!store) { throw { status: 404, message: "Tienda no encontrada" };}
  
  //crear el delivery
  const newDelivery = await prisma.deliveries.create({
    data: {fk_user, fk_store, delivery_status: delivery_status || "AVAILABLE", status: status !== false }
  });
  return newDelivery;
  
};


// actualizar status
export const updateDeliveryStatusService = async (id_delivery, nuevoStatus) => {
  const delivery = await prisma.deliveries.findUnique({where : {id_delivery: id_delivery}})
  if (!delivery) { throw { status: 404, message: "Delivery no encontrado" };}
  const updated = await prisma.deliveries.update({
    where: {id_delivery: id_delivery}, 
    data:{delivery_status: nuevoStatus}
  });
  return updated;
};

// obtener asignaciones pendientes
export const getPendingAssignmentsService = async (id_delivery) => {
  const delivery = await prisma.deliveries.findUnique({
    where:{id_delivery:id_delivery},
    include: {
      user: {select: {id_user:true, name:true, email:true}},
      store: {select : {id_store: true, name: true}},
      delivery_assignments: {
        where: {assignment_status: "PENDING"},
        include: {
          order: {
            select: {id_order: true, total: true, fk_address: true}
          }
        },
        orderBy: { created_at: "desc" }
      }
    }
  });
  // verificar que existe
  if (!delivery) {
    throw { status: 404, message: "Delivery no encontrado" };
  }
  
  return delivery;
};
//editar delivery
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
//obtener datos completos del delivery 
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
        take: 10  // ultimas 10 asignaciones
      }
    }
  });
  
  if (!delivery) {
    throw { status: 404, message: "Delivery no encontrado" };
  }
  
  return delivery;
};
//obtener todos los deliveries de una tienda
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