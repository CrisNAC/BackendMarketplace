import { prisma } from "../../../../lib/prisma.js";
import { getAuthorizedCustomerService } from "../../users/services/users.services.js";

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

export const updateAddressService = async (
    authenticatedUserId,
    requestedUserId,
    requestedAddressId,
    payload
) => {
    const customer = await getAuthorizedCustomerService(
        authenticatedUserId,
        requestedUserId
    );
    const addressId = parsePositiveInteger(
        requestedAddressId,
        "ID de direccion"
    );

    const existingAddress = await prisma.addresses.findFirst({
        where: {
            id_address: addressId,
            fk_user: customer.id_user,
            fk_store: null,
            status: true,
        },
        select: {
            id_address: true,
        },
    });

    if (!existingAddress) {
        throw {
            status: 404,
            message: "Direccion no encontrada",
        };
    }

    const dataToUpdate = {};

    if (payload?.address !== undefined) {
        const address = payload.address?.toString().trim();

        if (!address) {
            throw {
                status: 400,
                message: "address no puede estar vacio",
            };
        }

        dataToUpdate.address = address;
    }

    if (payload?.city !== undefined) {
        const city = payload.city?.toString().trim();

        if (!city) {
            throw {
                status: 400,
                message: "city no puede estar vacio",
            };
        }

        if (city.length > 100) {
            throw {
                status: 400,
                message: "city no puede superar 100 caracteres",
            };
        }

        dataToUpdate.city = city;
    }

    if (payload?.region !== undefined) {
        const region = payload.region?.toString().trim();

        if (!region) {
            throw {
                status: 400,
                message: "region no puede estar vacio",
            };
        }

        if (region.length > 100) {
            throw {
                status: 400,
                message: "region no puede superar 100 caracteres",
            };
        }

        dataToUpdate.region = region;
    }

    if (payload?.postal_code !== undefined) {
        if (payload.postal_code === null || payload.postal_code === "") {
            dataToUpdate.postal_code = null;
        } else {
            const postalCode = payload.postal_code.toString().trim();

            if (!postalCode) {
                throw {
                    status: 400,
                    message: "postal_code no puede estar vacio",
                };
            }

            if (postalCode.length > 20) {
                throw {
                    status: 400,
                    message: "postal_code no puede superar 20 caracteres",
                };
            }

            dataToUpdate.postal_code = postalCode;
        }
    }

    if (Object.keys(dataToUpdate).length === 0) {
        throw {
            status: 400,
            message:
                "Debe enviar al menos uno de estos campos: address, city, region, postal_code",
        };
    }

    const updatedAddress = await prisma.addresses.update({
        where: {
            id_address: addressId,
        },
        data: dataToUpdate,
        select: ADDRESS_SELECT,
    });

    return updatedAddress;
};
