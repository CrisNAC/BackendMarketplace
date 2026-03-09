//import { PrismaClient } from "@prisma/client";
import { prisma } from "../../../../lib/prisma.js";
import bcrypt from "bcrypt";

//const prisma = new PrismaClient();
const SALT_ROUNDS = 10;
const USER_PROFILE_SELECT = {
    id_user: true,
    name: true,
    email: true,
    phone: true,
    role: true,
    status: true,
    created_at: true,
    updated_at: true,
    addresses: {
        where: {
            status: true,
            fk_store: null,
        },
        orderBy: {
            created_at: "desc",
        },
        select: {
            id_address: true,
            address: true,
            city: true,
            region: true,
            postal_code: true,
            status: true,
            created_at: true,
            updated_at: true,
        },
    },
};

const parsePositiveInteger = (value, fieldName) => {
    const parsedValue = Number(value);

    if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
        throw {
            status: 400,
            message: `${fieldName} invalido`,
        };
    }

    return parsedValue;
};

export const getAuthorizedCustomerService = async (
    authenticatedUserId,
    requestedUserId
) => {
    if (!authenticatedUserId) {
        throw {
            status: 401,
            message: "Usuario autenticado requerido",
        };
    }

    const authenticatedId = parsePositiveInteger(
        authenticatedUserId,
        "ID de usuario autenticado"
    );
    const targetUserId = parsePositiveInteger(requestedUserId, "ID de usuario");

    if (authenticatedId !== targetUserId) {
        throw {
            status: 403,
            message: "No tiene permisos para editar este perfil",
        };
    }

    const user = await prisma.users.findUnique({
        where: { id_user: targetUserId },
        select: {
            id_user: true,
            role: true,
            status: true,
        },
    });

    if (!user || !user.status) {
        throw {
            status: 404,
            message: "Usuario no encontrado o inactivo",
        };
    }

    if (user.role !== "CUSTOMER") {
        throw {
            status: 403,
            message: "El usuario no es un cliente",
        };
    }

    return user;
};

export const createUserService = async (data) => {
    const {
        name,
        email,
        password,
        phone
    } = data;

    const existingUser = await prisma.users.findUnique({
        where: { email },
    });

    if (existingUser) {
        const error = new Error("El email ya se encuentra registrado");
        error.statusCode = 409;
        throw error;
    }

    //Hashear la password
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const newUser = await prisma.users.create({
        data: {
            name,
            email,
            password_hash,
            phone: phone ?? null,
            role: "CUSTOMER", //default
        },
        select: {
            id_user: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            status: true,
            created_at: true,
        },
    });

    return newUser;
}

export const updateUserService = async (
    authenticatedUserId,
    requestedUserId,
    payload
) => {
    const customer = await getAuthorizedCustomerService(
        authenticatedUserId,
        requestedUserId
    );

    const dataToUpdate = {};

    if (payload?.name !== undefined) {
        const name = payload.name?.toString().trim();

        if (!name) {
            throw {
                status: 400,
                message: "name no puede estar vacio",
            };
        }

        if (name.length > 100) {
            throw {
                status: 400,
                message: "name no puede superar 100 caracteres",
            };
        }

        dataToUpdate.name = name;
    }

    if (payload?.phone !== undefined) {
        if (payload.phone === null || payload.phone === "") {
            dataToUpdate.phone = null;
        } else {
            const phone = payload.phone.toString().trim();

            if (!phone) {
                throw {
                    status: 400,
                    message: "phone no puede estar vacio",
                };
            }

            if (phone.length > 20) {
                throw {
                    status: 400,
                    message: "phone no puede superar 20 caracteres",
                };
            }

            dataToUpdate.phone = phone;
        }
    }

    if (Object.keys(dataToUpdate).length === 0) {
        throw {
            status: 400,
            message: "Debe enviar al menos uno de estos campos: name, phone",
        };
    }

    const updatedUser = await prisma.users.update({
        where: {
            id_user: customer.id_user,
        },
        data: dataToUpdate,
        select: USER_PROFILE_SELECT,
    });

    return updatedUser;
};

