import { getProductCategoriesService } from "./product-category.service.js";

export const getProductCategories = async (req, res) => {
  try {
    const { search, limit } = req.query;
    const categories = await getProductCategoriesService({ search, limit });

    return res.status(200).json(categories);
  } catch (error) {
    console.error("Error obteniendo categorias de productos:", error);

    return res.status(error.status || 500).json({
      message: error.message || "Error interno del servidor"
    });
  }
};
