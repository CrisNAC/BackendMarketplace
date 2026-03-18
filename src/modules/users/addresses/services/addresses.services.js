//addresses.services.js
import { prisma } from "../../../../lib/prisma.js";

// limita la cantidad de direcciones activas que puede tener un usuario
const MAX_USER_ADDRESSES = 5;

// mantiene uniforme la informacion que devolvemos en las respuestas
const ADDRESS_SELECT = {
    id_address: true,
    fk_user: true,
    fk_store: true,
    address: true,
    city: true,
    region: true,
    postal_code: true,
    status: true,
    created_at: true,
    updated_at: true,
};

// asegura que los ids recibidos por params sean enteros positivos
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

// valida que el usuario autenticado sea el mismo de la ruta y que siga activo
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
            message: "No tiene permisos para gestionar estas direcciones",
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

// valida campos de texto obligatorios al crear o editar una direccion
const validateRequiredStringField = (value, fieldName, maxLength = null) => {
    const parsedValue = value?.toString().trim();

    if (!parsedValue) {
        throw {
            status: 400,
            message: `${fieldName} no puede estar vacio`,
        };
    }

    if (maxLength && parsedValue.length > maxLength) {
        throw {
            status: 400,
            message: `${fieldName} no puede superar ${maxLength} caracteres`,
        };
    }

    return parsedValue;
};

// normaliza campos opcionales para permitir null cuando corresponda
const validateOptionalStringField = (value, fieldName, maxLength = null) => {
    if (value === undefined) {
        return undefined;
    }

    if (value === null || value === "") {
        return null;
    }

    const parsedValue = value.toString().trim();

    if (!parsedValue) {
        throw {
            status: 400,
            message: `${fieldName} no puede estar vacio`,
        };
    }

    if (maxLength && parsedValue.length > maxLength) {
        throw {
            status: 400,
            message: `${fieldName} no puede superar ${maxLength} caracteres`,
        };
    }

    return parsedValue;
};

// centraliza la validacion del payload para reutilizarla en create y update
const buildAddressData = (payload, { requireAllFields = false } = {}) => {
    const data = {};

    if (requireAllFields || payload?.address !== undefined) {
        data.address = validateRequiredStringField(payload?.address, "address");
    }

    if (requireAllFields || payload?.city !== undefined) {
        data.city = validateRequiredStringField(payload?.city, "city", 100);
    }

    if (requireAllFields || payload?.region !== undefined) {
        data.region = validateRequiredStringField(payload?.region, "region", 100);
    }

    if (requireAllFields || payload?.postal_code !== undefined) {
        const postalCode = validateOptionalStringField(
            payload?.postal_code,
            "postal_code",
            20
        );

        data.postal_code = postalCode ?? null;
    }

    if (!requireAllFields && Object.keys(data).length === 0) {
        throw {
            status: 400,
            message:
                "Debe enviar al menos uno de estos campos: address, city, region, postal_code",
        };
    }

    return data;
};

// busca una direccion personal activa y confirma que pertenezca al usuario autenticado
const getOwnedPersonalAddressOrThrow = async (userId, requestedAddressId) => {
    const addressId = parsePositiveInteger(requestedAddressId, "ID de direccion");

    const address = await prisma.addresses.findFirst({
        where: {
            id_address: addressId,
            fk_user: userId,
            fk_store: null,
            status: true,
        },
        select: ADDRESS_SELECT,
    });

    if (!address) {
        throw {
            status: 404,
            message: "Direccion no encontrada",
        };
    }

    return address;
};

// crea una direccion personal y valida el limite maximo de direcciones activas
export const createAddressService = async (
    authenticatedUserId,
    requestedUserId,
    payload
) => {
    //const { fk_store, address, city, region, postal_code } = payload;
    const user = await getAuthorizedUserService(
        authenticatedUserId,
        requestedUserId
    );

    const dataToCreate = buildAddressData(payload, { requireAllFields: true });

    const newAddress = await prisma.$transaction(async (tx) => {

        const lockedUsers = await tx.$queryRaw`
            SELECT 1
            FROM "Users"
            WHERE "id_user" = ${user.id_user}
            AND "status" = TRUE
            FOR UPDATE
        `;

        if (!lockedUsers.length) {
            throw {
                status: 404,
                message: "Usuario no encontrado o inactivo",
            };
        }

        const addressesFromUser = await tx.addresses.count({
            where: {
                fk_user: user.id_user,
                fk_store: null,
                status: true,
            },
        });

        if (addressesFromUser >= MAX_USER_ADDRESSES) {
            throw {
                status: 400,
                message: `El usuario ya alcanzo el limite de ${MAX_USER_ADDRESSES} direcciones`,
            };
        }

        return tx.addresses.create({
            data: {
                fk_user: user.id_user,
                fk_store: null,
                ...dataToCreate,
            },
            select: ADDRESS_SELECT,
        });

    });

    return newAddress;
};

// devuelve la lista de direcciones personales activas del usuario autenticado
export const getAddressesByUserService = async (
    authenticatedUserId,
    requestedUserId
) => {
    const user = await getAuthorizedUserService(
        authenticatedUserId,
        requestedUserId
    );

    const addresses = await prisma.addresses.findMany({
        where: {
            fk_user: user.id_user,
            fk_store: null,
            status: true,
        },
        orderBy: {
            created_at: "desc",
        },
        select: ADDRESS_SELECT,
    });

    return addresses;
};

// devuelve una sola direccion si pertenece al usuario autenticado
export const getAddressByIdService = async (
    authenticatedUserId,
    requestedUserId,
    requestedAddressId
) => {
    const user = await getAuthorizedUserService(
        authenticatedUserId,
        requestedUserId
    );

    return getOwnedPersonalAddressOrThrow(user.id_user, requestedAddressId);
};

// actualiza solo los campos enviados de una direccion personal del usuario
export const updateAddressService = async (
    authenticatedUserId,
    requestedUserId,
    requestedAddressId,
    payload
) => {
    const user = await getAuthorizedUserService(
        authenticatedUserId,
        requestedUserId
    );
    const addressId = parsePositiveInteger(requestedAddressId, "ID de direccion");
    const dataToUpdate = buildAddressData(payload);

    const updatedAddresses = await prisma.addresses.updateMany({
        where: {
            id_address: addressId,
            fk_user: user.id_user,
            fk_store: null,
            status: true,
        },
        data: dataToUpdate,
    });

    if (updatedAddresses.count !== 1) {
        throw {
            status: 404,
            message: "Direccion no encontrada",
        };
    }

    const updatedAddress = await prisma.addresses.findUnique({
        where: {
            id_address: addressId,
        },
        select: ADDRESS_SELECT,
    });

    if (!updatedAddress) {
        throw {
            status: 500,
            message: "No se pudo recuperar la direccion actualizada",
        };
    }
    return updatedAddress;
};

// aplica borrado logico para que la direccion deje de estar disponible
export const deleteAddressService = async (
    authenticatedUserId,
    requestedUserId,
    requestedAddressId
) => {

    const user = await getAuthorizedUserService(
        authenticatedUserId,
        requestedUserId
    );
    const existingAddress = await getOwnedPersonalAddressOrThrow(
        user.id_user,
        requestedAddressId
    );

    const deletedAddress = await prisma.addresses.update({
        where: {
            id_address: existingAddress.id_address,
        },
        data: {
            status: false,
        },
        select: {
            id_address: true,
            status: true,
            updated_at: true,
        },
    });

    return deletedAddress;
};