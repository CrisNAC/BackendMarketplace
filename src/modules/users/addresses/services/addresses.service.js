import { prisma } from "../../../../../src/lib/prisma.js";

// Faltaria agregar una validacion de cantidad de direcciones que puede tener un usuario (5 direcciones)
export const createAddressService = async (data, authUser) => {
    const { fk_user, fk_store, address, city, region, postal_code } = data;

    // Verificar que sea el mismo usuario de la cuenta el que esta realizando la peticion
    if (authUser.id_user !== fk_user) {
        const error = new Error("Permisos insuficientes para crear direcciones en esta cuenta");
        error.statusCode = 403;
        throw error;
    }

    const user = await prisma.users.findUnique({
        where: { id_user: fk_user },
    });

    if (!user) {
        const error = new Error("El usuario no existe");
        error.statusCode = 404;
        throw error;
    }

    //Validacion de limite de direcciones (5)
    const addressesFromUser = await prisma.addresses.count({
        where: { fk_user, satus: true }
    });

    if (addressesFromUser >= 5) {
        const error = new Error("El usuario ya alcanzo el limite de direcciones");
        error.statusCode = 403;
        throw error;
    }

    const newAddress = await prisma.addresses.create({
        data : {
            fk_user,
            fk_store: fk_store ?? null,
            address,
            city,
            region,
            postal_code: postal_code ?? null,
        },
        select: {
            id_address: true,
            fk_user: true,
            fk_store: true,
            address: true,
            city: true,
            region: true,
            postal_code: true,
            status: true,
            created_at: true,
        },
    });

    return newAddress;
}

export const getAddressesByUserService = async (fk_user) => {
    const user = await prisma.users.findUnique({
        where: { id_user: fk_user },
    });

    if (!user) {
        const error = new Error("El usuario no existe");
        error.statusCode = 404;
        throw error;
    }

    const addresses = await prisma.addresses.findMany({
        where: { fk_user, status: true },
        select: {
            id_address: true,
            fk_user: true,
            fk_store: true,
            address: true,
            city: true,
            region: true,
            postal_code: true,
            status: true,
            created_at: true,
        },
    });

    return addresses;
};

export const getAddressByIdService = async (id_address) => {
    const address = await prisma.addresses.findUnique({
        where: { id_address, status: true },
        select: {
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
        },
    });

    if (!address) {
        const error = new Error("La dirección no existe");
        error.statusCode = 404;
        throw error;
    }

    return address;
};

export const updateAddressService = async (id_address, data) => {
    const { fk_store, address, city, region, postal_code } = data;

    const existingAddress = await prisma.addresses.findUnique({
        where: {id_address, status: true }
    });

    if (!existingAddress) {
        const error = new Error("La dirección no existe");
        error.statusCode = 404;
        throw error;
    }

    const updatedAddress = await prisma.addresses.update({
        where: { id_address },
        data: {
            fk_store: fk_store ?? existingAddress.fk_store,
            address: address ?? existingAddress.address,
            city: city ?? existingAddress.city,
            region: region ?? existingAddress.region,
            postal_code: postal_code ?? existingAddress.postal_code,
        },
        select: {
            id_address: true,
            fk_user: true,
            fk_store: true,
            address: true,
            city: true,
            region: true,
            postal_code: true,
            status: true,
            updated_at: true,
        },
    });

    return updatedAddress;
}

export const deleteAddressService = async (id_address) => {

    const existingAddress = await prisma.addresses.findUnique({
        where: { id_address, status: true },
    });

    if (!existingAddress) {
        const error = new Error("La dirección no existe");
        error.statusCode = 404;
        throw error;
    }

    // Aplicando borrado logico
    const deletedAddress = await prisma.addresses.update({
        where: { id_address },
        data: { status: false },
        select: {
            id_address: true,
            status: true,
            updated_at: true,
        },
    });

    return deletedAddress;
};