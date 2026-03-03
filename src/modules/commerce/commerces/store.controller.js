// src/modules/commerce/commerces/store.controller.js
import { createStoreService } from "./store.service.js";

export const createStore = async (req, res) => {
  try {
    const store = await createStoreService(req.body);
    return res.status(201).json(store);
  } catch (error) {
    console.error("Error creando comercio:", error);

    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }

    return res.status(500).json({
      message: "Error interno del servidor"
    });
  }
};