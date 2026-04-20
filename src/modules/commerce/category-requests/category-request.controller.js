import { createCategoryRequestService } from "./category-request.service.js";

/**
 * Crear una nueva solicitud de categoría de producto
 * El comercio autenticado solicita la creación de una nueva categoría de productos
 * @route POST /api/commerces/category-requests
 * @access Comercio (SELLER)
 * @param {Object} req - Request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.name - Nombre de la categoría solicitada
 * @param {Object} req.user - Usuario autenticado (inyectado por middleware JWT)
 * @param {number} req.user.id_user - ID del usuario
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware
 */
export const createCategoryRequest = async (req, res, next) => {
  try {
    const { name } = req.body;
    const categoryRequest = await createCategoryRequestService(name);

    return res.status(201).json({
      message: "Solicitud de categoría creada exitosamente",
      data: categoryRequest
    });
  } catch (error) {
    next(error);
  }
};