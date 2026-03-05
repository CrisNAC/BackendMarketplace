import { getProductTagsService } from "./product-tag.service.js";

export const getProductTags = async (req, res) => {
  try {
    const { search, limit } = req.query;
    const tags = await getProductTagsService({ search, limit });

    return res.status(200).json(tags);
  } catch (error) {
    console.error("Error obteniendo tags de productos:", error);

    return res.status(error.status || 500).json({
      message: error.message || "Error interno del servidor"
    });
  }
};
