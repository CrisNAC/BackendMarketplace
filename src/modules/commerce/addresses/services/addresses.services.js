//addresses.services.js
import { prisma } from "../../../../lib/prisma.js";
import { getAuthorizedStoreOwnerService } from "../../commerces/store.service.js";

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

// busca una direccion activa y confirma que pertenezca al comercio autenticado
const getOwnedStoreAddressOrThrow = async (storeId, requestedAddressId) => {
    const addressId = parsePositiveInteger(requestedAddressId, "ID de direccion");

    const address = await prisma.addresses.findFirst({
        where: {
            id_address: addressId,
            fk_store: storeId,
            status: true,
        },
        select: ADDRESS_SELECT,
    });

    if (!address) {
        throw {
            status: 404,
            message: "Direccion del comercio no encontrada",
        };
    }

    return address;
};

// crea una direccion asociada al comercio del usuario autenticado
export const createStoreAddressService = async (
    authenticatedUserId,
    requestedStoreId,
    payload
) => {
    const store = await getAuthorizedStoreOwnerService(
        authenticatedUserId,
        requestedStoreId
    );
    const dataToCreate = buildAddressData(payload, { requireAllFields: true });

    const newAddress = await prisma.addresses.create({
        data: {
            fk_user: store.fk_user,
            fk_store: store.id_store,
            ...dataToCreate,
        },
        select: ADDRESS_SELECT,
    });

    return newAddress;
};

// devuelve la lista de direcciones activas del comercio autenticado
export const getStoreAddressesService = async (
    authenticatedUserId,
    requestedStoreId
) => {
    const store = await getAuthorizedStoreOwnerService(
        authenticatedUserId,
        requestedStoreId
    );

    const addresses = await prisma.addresses.findMany({
        where: {
            fk_store: store.id_store,
            status: true,
        },
        orderBy: {
            created_at: "desc",
        },
        select: ADDRESS_SELECT,
    });

    return addresses;
};

// devuelve una sola direccion del comercio autenticado
export const getStoreAddressByIdService = async (
    authenticatedUserId,
    requestedStoreId,
    requestedAddressId
) => {
    const store = await getAuthorizedStoreOwnerService(
        authenticatedUserId,
        requestedStoreId
    );

    return getOwnedStoreAddressOrThrow(store.id_store, requestedAddressId);
};

// actualiza una direccion puntual del comercio autenticado
export const updateStoreAddressService = async (
    authenticatedUserId,
    requestedStoreId,
    requestedAddressId,
    payload
) => {
    const store = await getAuthorizedStoreOwnerService(
        authenticatedUserId,
        requestedStoreId
    );
    const existingAddress = await getOwnedStoreAddressOrThrow(
        store.id_store,
        requestedAddressId
    );
    const dataToUpdate = buildAddressData(payload);

    const updatedAddress = await prisma.addresses.update({
        where: {
            id_address: existingAddress.id_address,
        },
        data: dataToUpdate,
        select: ADDRESS_SELECT,
    });

    return updatedAddress;
};

// aplica borrado logico para desactivar una direccion del comercio
export const deleteStoreAddressService = async (
    authenticatedUserId,
    requestedStoreId,
    requestedAddressId
) => {
    const store = await getAuthorizedStoreOwnerService(
        authenticatedUserId,
        requestedStoreId
    );
    const existingAddress = await getOwnedStoreAddressOrThrow(
        store.id_store,
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
