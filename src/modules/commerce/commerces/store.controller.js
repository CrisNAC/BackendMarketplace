// src/modules/commerce/commerces/store.controller.js
import {
  createStoreService,
  updateStoreService,
  getStoreByIdService,
  getAllProductsByStoreService,
  filterStorePriductsService
} from "./store.service.js";

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

export const updateStore = async (req, res) => {
  try {
    const { id_store } = req.params;
    const store = await updateStoreService(
      req.user?.id_user,
      id_store,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Comercio actualizado exitosamente",
      data: store
    });
  } catch (error) {
    return res.status(error.status || error.statusCode || 500).json({
      success: false,
      message: error.message || "Error interno del servidor"
    });
  }
};

export const getStoreById = async (req, res) => {
  try {
    const { id_store } = req.params;
    const store = await getStoreByIdService(id_store);
    return res.status(200).json(store);
  } catch (error) {
    return res.status(error.status || 500).json({
      message: error.message || "Error interno"
    });
  }
};

export const getAllProductsByStore = async (req, res) => {
  try {
    const { id_store } = req.params;
    const products = await getAllProductsByStoreService(id_store);
    return res.status(200).json(products);
  } catch (error) {
    return res.status(error.status || 500).json({
      message: error.message || "Error interno"
    });
  }
};

export const filterStoreProducts = async (req, res) => {
  try {
    const { id_store } = req.params;
    const { category, price_min, price_max } = req.query;
    const products = await filterStorePriductsService(id_store, {
      category,
      price_min,
      price_max
    });
    return res.status(200).json(products);
  } catch (error) {
    return res.status(error.status || 500).json({
      message: error.message || "Error interno"
    });
  }
};
