import { getActiveBannersService } from "./banners.service.js";

export const getActiveBanners = async (req, res, next) => {
  try {
    const { limit } = req.query;
    const result = await getActiveBannersService({ limit });
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
