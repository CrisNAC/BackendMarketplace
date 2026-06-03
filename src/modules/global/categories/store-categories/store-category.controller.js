import { getStoreCategoriesService } from "./store-category.service.js";

export const getStoreCategories = async (req, res, next) => {
  try {
    const categories = await getStoreCategoriesService();

    return res.status(200).json(categories);
  } catch (error) {
    next(error);
  }
};
