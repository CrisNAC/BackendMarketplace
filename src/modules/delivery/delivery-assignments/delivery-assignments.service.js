//delivery-assignments.service.js
import { prisma } from '../../../lib/prisma.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { id } from 'zod/locales';


// aceptar asignación
export const acceptAssignmentService = async (id_delivery_assignment) => {
    const deliveryAssigment = await prisma.deliveryAssignments.findUnique({where: {id_delivery_assignment:id_delivery_assignment}})
    if (!deliveryAssigment) {throw {status: 404, message: "Delivery Assignment no existe"};}
    const updated = await prisma.deliveryAssignments.update({
      where :{id_delivery_assignment: id_delivery_assignment},
      data: {assignment_status: "ACCEPTED"}
    });
    return updated;
};

// rechazar asignación
export const rejectAssignmentService = async (id_delivery_assignment) => {
    const deliveryAssigment = await prisma.deliveryAssignments.findUnique({where: {id_delivery_assignment:id_delivery_assignment}})
    if (!deliveryAssigment) {throw {status: 404, message: "Delivery Assignment no existe"};}
    const updated = await prisma.deliveryAssignments.update({
      where :{id_delivery_assignment: id_delivery_assignment},
      data: {assignment_status: "REJECTED"}
    });
    return updated;
};