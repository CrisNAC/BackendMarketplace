import { Router } from "express";
import authenticate from "../../../config/jwt.config.js";
import { requireRole } from "../../../middlewares/auth.middleware.js";
import {
  getAdminProductCategory,
  getAdminCategories,
  getAdminCategoriesWithProducts,
  deleteAdminProductCategory,
  updateAdminProductCategory,
  processAdminCategoryRequest
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
router.get(
  "/filter/withProducts",
  authenticate,
  requireRole(ROLES.ADMIN),
  getAdminCategoriesWithProducts
);

/**
 * @swagger
 * /api/admin/categories/{id}:
 *   patch:
 *     summary: Aprobar o rechazar solicitud de categoría (Admin)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminCategoryRequestDecision'
 *     responses:
 *       200:
 *         description: Solicitud de categoría procesada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminCategoryRequestDecisionResponse'
 *       400:
 *         description: Solicitud inválida o ya procesada
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos de administrador
 *       404:
 *         description: Solicitud de categoría no encontrada
 */
router.patch("/:id", authenticate, requireRole(ROLES.ADMIN), processAdminCategoryRequest);

/**
 * @swagger
 * /api/admin/categories/{id}:
 *   put:
 *     summary: Editar categoría de productos (Admin)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Electrónica premium
 *               visible:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Categoría actualizada correctamente
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos de administrador
 *       404:
 *         description: Categoría no encontrada
 */
router.put("/:id", authenticate, requireRole(ROLES.ADMIN), updateAdminProductCategory);

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
