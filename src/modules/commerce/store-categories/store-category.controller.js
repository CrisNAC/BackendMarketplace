import { getStoreCategoriesService } from "./store-category.service.js";

export const getStoreCategories = async (req, res) => {
    try {
        const { search, limit } = req.query;
        const categories = await getStoreCategoriesService({ search, limit });

        return res.status(200).json(categories);
    } catch (error) {
        return res.status(error.status || error.statusCode || 500).json({
            message: error.message || "Error interno del servidor"
        });
    }
};