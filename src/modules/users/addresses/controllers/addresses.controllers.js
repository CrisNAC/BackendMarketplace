import { updateAddressService } from "../services/addresses.services.js";

export const updateAddress = async (req, res) => {
    try {
        const { id_user, id_address } = req.params;

        const address = await updateAddressService(
            req.user?.id_user,
            id_user,
            id_address,
            req.body
        );

        return res.status(200).json({
            success: true,
            message: "Direccion actualizada exitosamente",
            data: address,
        });
    } catch (error) {
        return res.status(error.status || error.statusCode || 500).json({
            success: false,
            message: error.message || "Error interno del servidor",
        });
    }
};
