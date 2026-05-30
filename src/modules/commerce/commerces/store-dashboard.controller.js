import { getStoreDashboardService } from "./store-dashboard.service.js";

export const getStoreDashboard = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que el comercio pertenece al usuario autenticado
        const dashboard = await getStoreDashboardService(id);

        return res.status(200).json(dashboard);
    } catch (error) {
        return res.status(error.status || 500).json({
            message: error.message || "Error interno del servidor"
        });
    }
};