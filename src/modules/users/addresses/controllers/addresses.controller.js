import { createAddressService, updateAddressService, getAddressByIdService, getAddressesByUserService, deleteAddressService } from "../services/addresses.service.js";

export const createAddress = async (req, res) => {
    try {
        const address = await createAddressService(req.body, req.user);
        res.status(201).json(address);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

export const getAddressesByUser = async (req, res) => {
    try {
        const fk_user = parseInt(req.params.fk_user);
        const addresses = await getAddressesByUserService(fk_user);
        res.status(200).json(addresses);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

export const getAddressById = async (req, res) => {
    try {
        const id_address = parseInt(req.params.id);
        const address = await getAddressByIdService(id_address);
        res.status(200).json(address);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

export const updateAddress = async (req, res) => {
    try {
        const id_address = parseInt(req.params.id);
        const address = await updateAddressService(id_address, req.body);
        res.status(200).json(address);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

export const deleteAddress = async (req, res) => {
    try {
        const id_address = parseInt(req.params.id);
        const address = await deleteAddressService(id_address);
        res.status(200).json({ message: "Dirección desactivada correctamente", address });
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};