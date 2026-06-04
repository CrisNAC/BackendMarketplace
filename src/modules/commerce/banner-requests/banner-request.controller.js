import {
  createBannerRequestService,
  getMyBannerRequestsService,
  deleteBannerRequestService,
} from "./banner-request.service.js";

export const createBannerRequest = async (req, res, next) => {
  try {
    if (!req.user?.id_user) {
      return res.status(401).json({ success: false, message: "Usuario autenticado requerido" });
    }
    const { storeId } = req.params;
    const result = await createBannerRequestService(req.user.id_user, storeId, req.body);
    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const getMyBannerRequests = async (req, res, next) => {
  try {
    if (!req.user?.id_user) {
      return res.status(401).json({ success: false, message: "Usuario autenticado requerido" });
    }
    const { storeId } = req.params;
    const { approval_status } = req.query;
    const result = await getMyBannerRequestsService(req.user.id_user, storeId, { approval_status }, req.pagination);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const deleteBannerRequest = async (req, res, next) => {
  try {
    if (!req.user?.id_user) {
      return res.status(401).json({ success: false, message: "Usuario autenticado requerido" });
    }
    const { storeId, requestId } = req.params;
    await deleteBannerRequestService(req.user.id_user, storeId, requestId);
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
};
