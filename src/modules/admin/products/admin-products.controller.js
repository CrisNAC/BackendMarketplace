import {
  getProductsAdminService,
  updateProductApprovalStatusService,
} from "./admin-products.service.js";

export const getProducts = async (req, res, next) => {
  try {
    const { search, approvalStatus } = req.query;
    const result = await getProductsAdminService({ search, approvalStatus }, req.pagination);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const updateProductStatus = async (req, res, next) => {
  try {
    if (!req.user?.id_user) {
      return res.status(401).json({ success: false, message: "Usuario autenticado requerido" });
    }
    const result = await updateProductApprovalStatusService(
      req.user.id_user,
      req.params.id,
      req.body
    );
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};