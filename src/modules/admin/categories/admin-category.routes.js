import { Router } from "express";
import authenticate from "../../../config/jwt.config.js";
import { requireRole } from "../../../middlewares/auth.middleware.js";
import { getAdminProductCategory } from "./admin-category.controller.js";
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

export { router as adminCategoryRoutes };