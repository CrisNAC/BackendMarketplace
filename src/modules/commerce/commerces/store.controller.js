import { createStoreService } from "./store.service.js";

export const createStore = async (req, res) => {
  try {
    const data = req.body;

    const store = await createStoreService(data);

    return res.status(201).json(store);

  } catch (error) {
    return res.status(error.status || 500).json({
      message: error.message || "Error interno del servidor"
    });
  }
};