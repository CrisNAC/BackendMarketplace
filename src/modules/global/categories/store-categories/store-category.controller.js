import { getStoreCategoriesService } from "./store-category.service.js";

export const getStoreCategories = async (req, res) => {
  try {
    const categories = await getStoreCategoriesService();

    return res.status(200).json(categories);
  } catch (error) {
    console.error("Error obteniendo categorias de comercios:", error);

    return res.status(error.status || 500).json({
      message: error.message || "Error interno del servidor"
    });
  }
};
