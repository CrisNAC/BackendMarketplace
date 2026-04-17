import { approveStoreService, getPendingStoresService } from "./admin-stores.service.js";

export const approveStore = async (req, res, next) => {
  try {
    const { id } = req.params;
    const store = await approveStoreService(id);
    return res.status(200).json({
      success: true,
      message: "Comercio aprobado exitosamente",
      data: store
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    next(error);
  }
};

export const getPendingStores = async (req, res, next) => {
  try {
    const result = await getPendingStoresService(req.pagination);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
