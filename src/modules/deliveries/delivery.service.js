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
    user: {
      id_user: user.id_user,
      name: user.name,
      email: user.email,
      role: user.role
    }
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

// FUNCIÓN 4: Aceptar asignación
export const acceptAssignment = async (assignmentId) => {
  // Tu lógica aquí
};

// FUNCIÓN 5: Rechazar asignación
export const rejectAssignment = async (assignmentId) => {
  // Tu lógica aquí
};

// FUNCIÓN 6: Actualizar status
export const updateDeliveryStatus = async (deliveryId, nuevoStatus) => {
  // Tu lógica aquí
};

// FUNCIÓN 7: Obtener asignaciones pendientes
export const getPendingAssignments = async (deliveryId) => {
  // Tu lógica aquí
};