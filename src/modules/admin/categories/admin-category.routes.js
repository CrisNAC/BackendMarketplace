import { Router } from "express";
import authenticate from "../../../config/jwt.config.js";
import { requireRole } from "../../../middlewares/auth.middleware.js";
import { 
    getAdminProductCategory, 
    deleteAdminProductCategory,
    updateAdminProductCategory
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
 * /api/admin/categories/{id}:
 *   put:
 *     summary: Editar categorí­a de productos (Admin)
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
 *               description:
 *                 type: string
 *                 nullable: true
 *                 example: Categoría para productos electrónicos de alta gama
 *               visibility:
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
