import { validateId } from "../../../lib/validators.js";
import { 
  getAdminProductCategoryService,
  getAllCategories, 
  filterCategoriesWithProducts,
  deleteAdminProductCategoryService,
  updateAdminProductCategoryService
} from "./admin-category.service.js";
import { PAGINATION } from "../../../utils/contants/pagination.constant.js";

export const getAdminProductCategory = async (req, res, next) => {
  try {
    const id = validateId(req.params.id);
    const result = await getAdminProductCategoryService(id);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const parseCategoryPagination = (query) => {
  const page = Math.max(1, parseInt(query.categoryPage) || PAGINATION.DEFAULT_PAGE);
  const limit = Math.min(
    Math.max(1, parseInt(query.categoryLimit) || PAGINATION.DEFAULT_LIMIT),
    PAGINATION.MAX_LIMIT
  );
  return { page, limit, skip: (page - 1) * limit };
};

const parseProductPagination = (query) => {
  const page = Math.max(1, parseInt(query.productPage) || PAGINATION.DEFAULT_PAGE);
  const limit = Math.min(
    Math.max(1, parseInt(query.productLimit) || PAGINATION.DEFAULT_LIMIT),
    PAGINATION.MAX_LIMIT
  );
  return { page, limit, skip: (page - 1) * limit };
};

export const getAdminCategories = async (req, res, next) => {
  try {
    const { visible, searchCategory } = req.query;
    const categoryPagination = parseCategoryPagination(req.query);
    const result = await getAllCategories({ visible, searchCategory }, categoryPagination);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getAdminCategoriesWithProducts = async (req, res, next) => {
  try {
    const { visible, search, searchCategory, searchProduct } = req.query;
    const categoryPagination = parseCategoryPagination(req.query);
    const productPagination = parseProductPagination(req.query);
    const result = await filterCategoriesWithProducts(
      { visible, search, searchCategory, searchProduct },
      categoryPagination,
      productPagination
    );
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const deleteAdminProductCategory = async (req, res, next) => {
  try {
    const id = validateId(req.params.id);
    await deleteAdminProductCategoryService(id);
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const updateAdminProductCategory = async (req, res, next) => {
  try {
    const id = validateId(req.params.id);
    const result = await updateAdminProductCategoryService(id, req.body);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};