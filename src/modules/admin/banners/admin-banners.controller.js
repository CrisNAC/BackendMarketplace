import { validateId } from "../../../lib/validators.js";
import {
  createAdminBannerService,
  getAdminBannersService,
  toggleAdminBannerActiveService,
  updateAdminBannerService,
  getBannerRequestsService,
  processBannerRequestService,
} from "./admin-banners.service.js";

export const createAdminBanner = async (req, res, next) => {
  try {
    const result = await createAdminBannerService(req.body);
    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const getAdminBanners = async (req, res, next) => {
  try {
    const { search, active, status } = req.query;
    const result = await getAdminBannersService({ search, active, status }, req.pagination);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const updateAdminBanner = async (req, res, next) => {
  try {
    const id = validateId(req.params.id);
    const result = await updateAdminBannerService(id, req.body);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const toggleAdminBannerActive = async (req, res, next) => {
  try {
    const id = validateId(req.params.id);
    const result = await toggleAdminBannerActiveService(id, req.body?.isActive);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getBannerRequests = async (req, res, next) => {
  try {
    const { search, approval_status } = req.query;
    const result = await getBannerRequestsService({ search, approval_status }, req.pagination);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const processBannerRequest = async (req, res, next) => {
  try {
    const id = validateId(req.params.id);
    const result = await processBannerRequestService(id, req.body);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
