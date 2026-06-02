//import { PrismaClient } from "@prisma/client";
//users.services.js
import { prisma } from "../../../../lib/prisma.js";
import { validateDeliveryPhone } from "../../../../lib/phone.js";
import crypto from "crypto";
import { sendPasswordResetEmail } from "../../../../lib/email.service.js";
import { hashPassword, verifyPassword } from "../../../../lib/utils/password.utils.js";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
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

const getAuthorizedUserService = async (
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
            message: "No tiene permisos para ver este perfil",
        };
    }

    const user = await prisma.users.findUnique({
        where: { id_user: targetUserId },
        select: {
            id_user: true,
            status: true,
        },
    });

    if (!user || !user.status) {
        throw {
            status: 404,
            message: "Usuario no encontrado o inactivo",
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

    // Hashear la contraseña usando password.utils.js
    let password_hash;
    try {
        password_hash = await hashPassword(password);
    } catch (hashError) {
        const error = new Error(hashError.message);
        error.statusCode = 400;
        throw error;
    }

    const newUser = await prisma.users.create({
        data: {
            name,
            email,
            password_hash,
            phone: phone ?? null,
            role: "CUSTOMER",
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
};

export const updateUserService = async (
    authenticatedUserId,
    requestedUserId,
    payload
) => {
    const customer = await getAuthorizedUserForUpdateService(authenticatedUserId, requestedUserId);

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

            dataToUpdate.phone = validateDeliveryPhone(phone);
        }
    }

    if (payload?.email !== undefined) {
        const email = payload.email?.toString().trim().toLowerCase();

        if (!email) {
            throw {
                status: 400,
                message: "email no puede estar vacio",
            };
        }

        if (!EMAIL_REGEX.test(email)) {
            throw {
                status: 400,
                message: "El formato del email no es valido",
            };
        }

        const existingUser = await prisma.users.findUnique({
            where: {
                email,
            },
            select: {
                id_user: true,
            },
        });

        if (existingUser && existingUser.id_user !== customer.id_user) {
            throw {
                status: 409,
                message: "El email ya se encuentra registrado",
            };
        }

        dataToUpdate.email = email;
    }

    if (Object.keys(dataToUpdate).length === 0) {
        throw {
            status: 400,
            message: "Debe enviar al menos uno de estos campos: name, phone, email",
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

export const updateUserPasswordService = async (
    authenticatedUserId,
    requestedUserId,
    payload
) => {
    const customer = await getAuthorizedUserForUpdateService(authenticatedUserId, requestedUserId);

    const currentPassword = payload?.currentPassword?.toString();
    const newPassword = payload?.newPassword?.toString();

    if (!currentPassword || !newPassword) {
        throw {
            status: 400,
            message: "currentPassword y newPassword son requeridos",
        };
    }

    if (newPassword.trim().length < 6) {
        throw {
            status: 400,
            message: "newPassword debe tener al menos 6 caracteres",
        };
    }

    const userWithPassword = await prisma.users.findUnique({
        where: {
            id_user: customer.id_user,
        },
        select: {
            password_hash: true,
        },
    });

    if (!userWithPassword) {
        throw {
            status: 404,
            message: "Usuario no encontrado",
        };
    }

    // Verificar contraseña actual usando password.utils.js
    let passwordMatch;
    try {
        passwordMatch = await verifyPassword(currentPassword, userWithPassword.password_hash);
    } catch (verifyError) {
        // Error técnico en bcrypt (hash corrupto)
        console.error("[UPDATE_PASSWORD_VERIFY_ERROR]", verifyError.message);
        throw {
            status: 400,
            message: "Error al verificar contraseña actual",
        };
    }

    if (!passwordMatch) {
        throw {
            status: 400,
            message: "La contraseña actual es incorrecta",
        };
    }

    // Hashear nueva contraseña usando password.utils.js
    let password_hash;
    try {
        password_hash = await hashPassword(newPassword.trim());
    } catch (hashError) {
        const error = new Error(hashError.message);
        error.status = 400;
        throw error;
    }

    const updatedUser = await prisma.users.update({
        where: {
            id_user: customer.id_user,
        },
        data: {
            password_hash,
        },
        select: USER_PROFILE_SELECT,
    });

    return updatedUser;
};

export const getUserProfileService = async (authenticatedUserId, requestedUserId) => {

    const userProfile = await getAuthorizedUserService(
        authenticatedUserId,
        requestedUserId
    );

    const user = await prisma.users.findFirst({
        where: {
            id_user: userProfile.id_user,
            status: true,
        },
        select: USER_PROFILE_SELECT
    });

    if (!user) {
        throw {
            status: 404,
            message: "Usuario no encontrado o inactivo",
        };
    }

    return user;
};

const getAuthorizedUserForUpdateService = async (
    authenticatedUserId,
    requestedUserId
) => {
    if (!authenticatedUserId) {
        throw { status: 401, message: "Usuario autenticado requerido" };
    }

    const authenticatedId = parsePositiveInteger(authenticatedUserId, "ID de usuario autenticado");
    const targetUserId = parsePositiveInteger(requestedUserId, "ID de usuario");

    if (authenticatedId !== targetUserId) {
        throw { status: 403, message: "No tiene permisos para editar este perfil" };
    }

    const user = await prisma.users.findUnique({
        where: { id_user: targetUserId },
        select: { id_user: true, role: true, status: true },
    });

    if (!user || !user.status) {
        throw { status: 404, message: "Usuario no encontrado o inactivo" };
    }

    return user;
};

const RESET_TOKEN_EXPIRY_MS = 10 * 60 * 1000;

export const requestPasswordResetService = async (email) => {
    if (!email || !EMAIL_REGEX.test(email.trim())) {
        throw { status: 400, message: "El formato del email no es válido" };
    }

    const user = await prisma.users.findUnique({
        where: { email: email.trim().toLowerCase() },
        select: { id_user: true, status: true },
    });

    // No se retorna nada para no dar info de si el correo existe en la database
    if (!user || !user.status) return;

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

    await prisma.users.update({
        where: { id_user: user.id_user },
        data: {
            password_reset_token: token,
            password_reset_token_expires: expires,
        },
    });

    await sendPasswordResetEmail(email.trim().toLowerCase(), token);
};

export const validateResetTokenService = async (token) => {
    if (!token) {
        throw { status: 400, message: "Token requerido" };
    }

    const user = await prisma.users.findFirst({
        where: {
            password_reset_token: token,
            password_reset_token_expires: { gt: new Date() },
            status: true,
        },
        select: { id_user: true },
    });

    if (!user) {
        throw { status: 400, message: "El enlace de recuperación no es válido o ha expirado" };
    }

    return { valid: true };
};

export const resetPasswordService = async (token, newPassword) => {
    if (!token) {
        throw { status: 400, message: "Token requerido" };
    }

    if (!newPassword || newPassword.trim().length < 8) {
        throw { status: 400, message: "La nueva contraseña debe tener al menos 8 caracteres" };
    }

    // Hashear nueva contraseña usando password.utils.js
    let password_hash;
    try {
        password_hash = await hashPassword(newPassword.trim());
    } catch (hashError) {
        const error = new Error(hashError.message);
        error.status = 400;
        throw error;
    }

    const result = await prisma.users.updateMany({
        where: {
            password_reset_token: token,
            password_reset_token_expires: { gt: new Date() },
            status: true,
        },
        data: {
            password_hash,
            password_reset_token: null,
            password_reset_token_expires: null,
        },
    });

    if (result.count === 0) {
        const error = new Error("El enlace de recuperación no es válido o ha expirado");
        error.status = 400;
        throw error;
    }
};