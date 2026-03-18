import { getStoreCategoriesService } from "./store-category.service.js";

/**
 * ANTES (manejo de error manual en cada controller):
 *
 * export const getStoreCategories = async (req, res) => {
 *   try {
 *     const categories = await getStoreCategoriesService();
 *     return res.status(200).json(categories);
 *   } catch (error) {
 *     console.error("Error obteniendo categorias de comercios:", error);
 *     return res.status(error.status || 500).json({
 *       message: error.message || "Error interno del servidor"
 *     });
 *   }
 * };
 *
 * AHORA (el error se delega al middleware global errorHandler via next):
 * - El controller solo maneja el caso exitoso
 * - next(error) lo captura errorHandler en index.js y responde con formato estandar
 * - El service lanza clases de error tipadas (ValidationError, NotFoundError, etc.)
 *   que errorHandler convierte automaticamente al codigo HTTP correcto
 */
export const getStoreCategories = async (req, res, next) => {
  try {
    const categories = await getStoreCategoriesService();

    return res.status(200).json(categories);
  } catch (error) {
    next(error);
  }
};
