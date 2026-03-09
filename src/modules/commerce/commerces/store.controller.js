// src/modules/commerce/commerces/store.controller.js
import {
  createStoreService,
  getStoreByIdService,
  getAllProductsByStoreService,
  filterStorePriductsService
} from "./store.service.js";

/**
 * Controlador para crear un nuevo comercio. Recibe los datos del comercio en el cuerpo de la solicitud, llama al servicio correspondiente y maneja las respuestas y errores.
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
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

/**
 * Controlador para obtener un comercio por su ID. Recibe el ID del comercio como parámetro de ruta, llama al servicio correspondiente y maneja las respuestas y errores.
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
export const getStoreById = async (req, res) => {
  try {
    const { id } = req.params;
    const store = await getStoreByIdService(id);
    return res.status(200).json(store);
  } catch (error) {
    return res.status(error.status || 500).json({
      message: error.message || "Error interno"
    });
  }
};

/**
 * Controlador para obtener todos los productos de una tienda específica. Recibe el ID de la tienda como parámetro de ruta, llama al servicio correspondiente y maneja las respuestas y errores.
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
export const getAllProductsByStore = async (req, res) => {
  try {
    const { id } = req.params;
    const products = await getAllProductsByStoreService(id);
    return res.status(200).json(products);
  } catch (error) {
    return res.status(error.status || 500).json({
      message: error.message || "Error interno"
    });
  }
};

/**
 * Controlador para filtrar productos de una tienda específica por categoría y rango de precios. Recibe el ID de la tienda como parámetro de ruta y los filtros como query parameters, llama al servicio correspondiente y maneja las respuestas y errores.
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
export const filterStoreProducts = async (req, res) => {
  try {
    const { id } = req.params;
    const { category, price_min, price_max } = req.query;
    const products = await filterStorePriductsService(id, { category, price_min, price_max });
    return res.status(200).json(products);
  } catch (error) {
    return res.status(error.status || 500).json({
      message: error.message || "Error interno"
    });
  }
};

