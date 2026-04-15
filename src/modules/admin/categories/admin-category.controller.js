import { validateId } from "../../../lib/validators.js";
import { getAdminProductCategoryService } from "./admin-category.service.js";

export const getAdminProductCategory = async (req, res, next) => {
  try {
    const id = validateId(req.params.id);
    const result = await getAdminProductCategoryService(id);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};