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
    latitude: true,
    longitude: true,
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

const validateCoordinateField = (value, fieldName, min, max) => {
    const parsedValue = Number(value);

    if (!Number.isFinite(parsedValue) || parsedValue < min || parsedValue > max) {
        throw {
            status: 400,
            message: `${fieldName} invalida`,
        };
    }

    return parsedValue;
};

const getReverseGeocodedAddress = async (latitude, longitude) => {
    const params = new URLSearchParams({
        format: "json",
        lat: latitude.toString(),
        lon: longitude.toString(),
    });

    const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
        {
            headers: {
                "User-Agent": "BackendMarketplace/1.0",
                Accept: "application/json",
                "Accept-Language": "es",
            },
        }
    );

    if (!response.ok) {
        throw {
            status: 502,
            message: "No se pudo obtener la ubicacion desde Nominatim",
        };
    }

    const data = await response.json();
    const parsedAddress = data?.address || {};

    const city = validateRequiredStringField(
        parsedAddress.city ||
            parsedAddress.town ||
            parsedAddress.village ||
            parsedAddress.hamlet ||
            parsedAddress.county ||
            parsedAddress.state ||
            "Sin ciudad",
        "city",
        100
    );

    const region = validateRequiredStringField(
        parsedAddress.suburb ||
            parsedAddress.neighbourhood ||
            parsedAddress.city_district ||
            parsedAddress.state_district ||
            parsedAddress.road ||
            parsedAddress.residential ||
            parsedAddress.county ||
            "Sin region",
        "region",
        100
    );

    const postalCode = validateOptionalStringField(
        parsedAddress.postcode ?? null,
        "postal_code",
        20
    );

    return {
        city,
        region,
        postal_code: postalCode ?? null,
    };
};

const buildCreateAddressData = async (payload) => {
    const address = validateRequiredStringField(payload?.address, "address");
    const latitude = validateCoordinateField(payload?.latitude, "latitud", -90, 90);
    const longitude = validateCoordinateField(payload?.longitude, "longitud", -180, 180);
    const reverseAddress = await getReverseGeocodedAddress(latitude, longitude);

    return {
        address,
        ...reverseAddress,
        latitude,
        longitude,
    };
};

const buildUpdateAddressData = async (payload) => {
    const data = {};

    if (payload?.address !== undefined) {
        data.address = validateRequiredStringField(payload?.address, "address");
    }

    const hasLatitude = payload?.latitude !== undefined;
    const hasLongitude = payload?.longitude !== undefined;

    if (hasLatitude !== hasLongitude) {
        throw {
            status: 400,
            message: "Debe enviar latitud y longitud juntas",
        };
    }

    if (hasLatitude && hasLongitude) {
        const latitude = validateCoordinateField(payload?.latitude, "latitud", -90, 90);
        const longitude = validateCoordinateField(payload?.longitude, "longitud", -180, 180);
        const reverseAddress = await getReverseGeocodedAddress(latitude, longitude);

        data.latitude = latitude;
        data.longitude = longitude;
        data.city = reverseAddress.city;
        data.region = reverseAddress.region;
        data.postal_code = reverseAddress.postal_code;
    }

    if (Object.keys(data).length === 0) {
        throw {
            status: 400,
            message: "Debe enviar al menos uno de estos campos: address, latitude, longitude",
        };
    }

    return data;
};

// busca una direccion personal activa y confirma que pertenezca al usuario autenticado
const getOwnedPersonalAddressOrThrow = async (userId, requestedAddressId) => {
    const addressId = parsePositiveInteger(requestedAddressId, "ID de dirección");

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
            message: "Dirección no encontrada",
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
    const user = await getAuthorizedUserService(
        authenticatedUserId,
        requestedUserId
    );
    const dataToCreate = await buildCreateAddressData(payload);

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
                message: `El usuario ya alcanzó el límite de ${MAX_USER_ADDRESSES} direcciones`,
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
    const addressId = parsePositiveInteger(requestedAddressId, "ID de dirección");
    const dataToUpdate = await buildUpdateAddressData(payload);

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
            message: "Dirección no encontrada",
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
            message: "No se pudo recuperar la dirección actualizada",
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