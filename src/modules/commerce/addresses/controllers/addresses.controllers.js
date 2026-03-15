//addresses.controllers.js
import {
    createStoreAddressService,
    deleteStoreAddressService,
    getStoreAddressByIdService,
    getStoreAddressesService,
    updateStoreAddressService,
} from "../services/addresses.services.js";

const getErrorStatusCode = (error) => error.statusCode || error.status || 500;

// crea una direccion para el comercio autenticado
export const createStoreAddress = async (req, res) => {
    try {
        const { id } = req.params;

        const address = await createStoreAddressService(
            req.user?.id_user,
            id,
            req.body
        );

        return res.status(201).json({
            success: true,
            message: "Direccion del comercio creada exitosamente",
            data: address,
        });
    } catch (error) {
        return res.status(getErrorStatusCode(error)).json({
            success: false,
            message: error.message || "Error interno del servidor",
        });
    }
};

// devuelve la lista de direcciones del comercio autenticado
export const getStoreAddresses = async (req, res) => {
    try {
        const { id } = req.params;

        const addresses = await getStoreAddressesService(
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

// devuelve una direccion puntual del comercio autenticado
export const getStoreAddressById = async (req, res) => {
    try {
        const { id, id_address } = req.params;

        const address = await getStoreAddressByIdService(
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

// actualiza una direccion puntual del comercio autenticado
export const updateStoreAddress = async (req, res) => {
    try {
        const { id, id_address } = req.params;

        const address = await updateStoreAddressService(
            req.user?.id_user,
            id,
            id_address,
            req.body
        );

        return res.status(200).json({
            success: true,
            message: "Direccion del comercio actualizada exitosamente",
            data: address,
        });
    } catch (error) {
        return res.status(getErrorStatusCode(error)).json({
            success: false,
            message: error.message || "Error interno del servidor",
        });
    }
};

// desactiva una direccion puntual del comercio autenticado
export const deleteStoreAddress = async (req, res) => {
    try {
        const { id, id_address } = req.params;

        const address = await deleteStoreAddressService(
            req.user?.id_user,
            id,
            id_address
        );

        return res.status(200).json({
            success: true,
            message: "Direccion del comercio desactivada correctamente",
            data: address,
        });
    } catch (error) {
        return res.status(getErrorStatusCode(error)).json({
            success: false,
            message: error.message || "Error interno del servidor",
        });
    }
};
