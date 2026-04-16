import { Router } from "express";
import authenticate from "../../../config/jwt.config.js";
import { requireRole } from "../../../middlewares/auth.middleware.js";
import { 
    getAdminProductCategory,
    getAdminCategories, 
    getAdminCategoriesWithProducts, 
    deleteAdminProductCategory  
} from "./admin-category.controller.js";
import { ROLES } from "../../../utils/contants/roles.constant.js";

const router = Router();

/**
 * @swagger
 * /api/admin/categories/{id}:
 *   get:
 *     summary: Ver categoría de productos (Admin)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Categoría encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminCategoryResponse'
 *       400:
 *         description: ID inválido
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos de administrador
 *       404:
 *         description: Categoría no encontrada
 */
router.get("/:id", authenticate, requireRole(ROLES.ADMIN), getAdminProductCategory);

/**
 * @swagger
 * /api/admin/categories:
 *   get:
 *     summary: Listar categorías (Admin)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: visible
 *         schema:
 *           type: string
 *           enum: [all, true, false]
 *       - in: query
 *         name: searchCategory
 *         schema:
 *           type: string
 *       - in: query
 *         name: categoryPage
 *         schema:
 *           type: integer
 *       - in: query
 *         name: categoryLimit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de categorías
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminCategoryListResponse'
 */
router.get("/", authenticate, requireRole(ROLES.ADMIN), getAdminCategories);

/**
 * @swagger
 * /api/admin/categories/filter/withProducts:
 *   get:
 *     summary: Listar categorías con productos (Admin)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: visible
 *         schema:
 *           type: string
 *           enum: [all, true, false]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: searchCategory
 *         schema:
 *           type: string
 *       - in: query
 *         name: searchProduct
 *         schema:
 *           type: string
 *       - in: query
 *         name: categoryPage
 *         schema:
 *           type: integer
 *       - in: query
 *         name: categoryLimit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: productPage
 *         schema:
 *           type: integer
 *       - in: query
 *         name: productLimit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de categorías con productos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminCategoryWithProductsListResponse'
 */
router.get("/filter/withProducts", authenticate, requireRole(ROLES.ADMIN), getAdminCategoriesWithProducts);

/**
 * @swagger
 * /api/admin/categories/{id}:
 *   delete:
 *     summary: Borrar categoría de productos (Admin)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Categoría eliminada correctamente
 *       400:
 *         description: ID inválido o categoría protegida
 *       404:
 *         description: Categoría no encontrada
 */
router.delete("/:id", authenticate, requireRole(ROLES.ADMIN), deleteAdminProductCategory);

export { router as adminCategoryRoutes };