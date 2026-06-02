import { getProductCategoriesService } from "./product-category.service.js";

export const getProductCategories = async (req, res, next) => {
  try {
    const { search, limit } = req.query;
    const categories = await getProductCategoriesService({ search, limit });

    return res.status(200).json(categories);
  } catch (error) {
    next(error);
  }
};
