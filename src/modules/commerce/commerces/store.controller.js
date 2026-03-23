import {
  createStoreService,
  updateStoreService,
  getStoreByIdService,
  getStoresService,
  getAllProductsByStoreService,
  filterStorePriductsService,
  deleteStoreService
} from "./store.service.js";
import jwt from "jsonwebtoken";
import { StoreProductItemDTO } from "./dtos/filter-store-products.response.dto.js";
import { PaginatedResponseDTO } from "../../../lib/dto/base.response.dto.js";

export const createStore = async (req, res) => {
  try {
    if (!req.user?.id_user) {
      return res.status(401).json({
        success: false,
        message: "Usuario autenticado requerido"
      });
    }

    const store = await createStoreService({
      ...req.body,
      fk_user: Number(req.user.id_user)
    });

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
    const { id } = req.params;
    const store = await updateStoreService(
      req.user?.id_user,
      id,
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
    const { id } = req.params;
    const store = await getStoreByIdService(id);
    if (!store || !store.status) {
      throw { status: 404, message: "Comercio no encontrado" };
    }
    return res.status(200).json(store);
  } catch (error) {
    return res.status(error.status || 500).json({
      message: error.message || "Error interno"
    });
  }
};

export const getStores = async (req, res) => {
  try {
    const stores = await getStoresService(req.query);
    return res.status(200).json(stores);
  } catch (error) {
    return res.status(error.status || 500).json({
      message: error.message || "Error interno"
    });
  }
};

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

export const filterStoreProducts = async (req, res) => {
  try {
    const { id } = req.params;
    const filters = req.query;           // ya validado por validate(FilterStoreProductsDTO)
    const pagination = req.pagination;   // ya parseado por parsePagination

    const { products, totalProducts } = await filterStoreProductsService(
      id,
      filters,
      pagination
    );

    const response = PaginatedResponseDTO.from(
      StoreProductItemDTO.mapList
        ? products.map(StoreProductItemDTO.map)
        : products.map((p) => new StoreProductItemDTO(p)),
      totalProducts,
      pagination.page,
      pagination.limit
    );

    return res.status(200).json(response);
  } catch (error) {
    const status =
      Number.isInteger(error?.status) && error.status >= 400 && error.status <= 599
        ? error.status
        : 500;
    return res.status(status).json({
      message: status < 500 ? error.message : "Error interno del servidor"
    });
  }
};

/**
 * 
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
export const deleteStore = async (req, res) => {
  try {

    //primeramente se hace la comprobacion de que el usuario este autenticado
    const token = req.cookies.userToken;
    if (!token) {
      console.error("Usuario no autenticado.");
      return res.status(401).json({ message: "Usuario no autenticado." });
    }

    //se descifra el token para obtener el usuario
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const id_user = decoded.id_user;

    //se obtiene el parametro id de la url
    const id_store = parseInt(req.params.id);
    if (isNaN(id_store) || id_store <= 0) return res.status(400).json({ message: "Id de comercio invalido." }); //validacion de id

    //se ejecuta el servicio delete
    await deleteStoreService(id_user, id_store);

    //en caso de exito se retorna el emsaje correspondiente
    console.info("Se eliminó correctamente el comercio...")
    return res.status(204).send();
  }
  catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message })
    console.error("Error al eliminar el comercio: ", error);
    return res.status(500).json({ message: "Error interno del servidor." })
  }
}

