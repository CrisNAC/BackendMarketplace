//addresses.controllers.js
import {
    createAddressService,
    deleteAddressService,
    getAddressByIdService,
    getAddressesByUserService,
    updateAddressService,
} from "../services/addresses.services.js";

const getErrorStatusCode = (error) => error.statusCode || error.status || 500;

// crea una direccion para el usuario autenticado
export const createAddress = async (req, res) => {
    try {
        const { id } = req.params;

        const address = await createAddressService(
            req.user?.id_user,
            id,
            req.body
        );

        return res.status(201).json({
            success: true,
            message: "Direccion creada exitosamente",
            data: address,
        });
    } catch (error) {
        return res.status(getErrorStatusCode(error)).json({
            success: false,
            message: error.message || "Error interno del servidor",
        });
    }
};

// devuelve la lista de direcciones del usuario autenticado
export const getAddressesByUser = async (req, res) => {
    try {
        const { id } = req.params;

        const addresses = await getAddressesByUserService(
            req.user?.id_user,
            id
        );

        return res.status(200).json({
            success: true,
            data: addresses,
        });
    } catch (error) {
        return res.status(getErrorStatusCode(error)).json({
            success: false,
            message: error.message || "Error interno del servidor",
        });
    }
};

// devuelve una direccion puntual del usuario autenticado
export const getAddressById = async (req, res) => {
    try {
        const { id, id_address } = req.params;

        const address = await getAddressByIdService(
            req.user?.id_user,
            id,
            id_address
        );

        return res.status(200).json({
            success: true,
            data: address,
        });
    } catch (error) {
        return res.status(getErrorStatusCode(error)).json({
            success: false,
            message: error.message || "Error interno del servidor",
        });
    }
};

// actualiza una direccion puntual del usuario autenticado
export const updateAddress = async (req, res) => {
    try {
        const { id, id_address } = req.params;

        const address = await updateAddressService(
            req.user?.id_user,
            id,
            id_address,
            req.body
        );

        return res.status(200).json({
            success: true,
            message: "Direccion actualizada exitosamente",
            data: address,
        });
    } catch (error) {
        return res.status(getErrorStatusCode(error)).json({
            success: false,
            message: error.message || "Error interno del servidor",
        });
    }
};

// desactiva una direccion puntual del usuario autenticado
export const deleteAddress = async (req, res) => {
    try {
        const { id, id_address } = req.params;

        const address = await deleteAddressService(
            req.user?.id_user,
            id,
            id_address
        );

        return res.status(200).json({
            success: true,
            message: "Direccion desactivada correctamente",
            data: address,
        });
    } catch (error) {
        return res.status(getErrorStatusCode(error)).json({
            success: false,
            message: error.message || "Error interno del servidor",
        });
    }
};
