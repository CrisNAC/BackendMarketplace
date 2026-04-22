import { Router } from "express";
import authenticate from "../../../config/jwt.config.js";
import { requireRole } from "../../../middlewares/auth.middleware.js";
import { createCategoryRequest } from "./category-request.controller.js";
import { ROLES } from "../../../utils/contants/roles.constant.js";

const router = Router();

/**
 * @swagger
 * /api/commerces/category-requests:
 *   post:
 *     summary: Crear solicitud de categoría de producto
 *     description: El comercio solicitante crea una solicitud al administrador para crear una nueva categoría de productos. La solicitud será revisada y aprobada por un administrador.
 *     tags: [Categorías]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCategoryRequestBody'
 *     responses:
 *       201:
 *         description: Solicitud de categoría creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryRequestSuccessResponse'
 *       400:
 *         description: Nombre vacío o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryRequestErrorResponse'
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos de comercio
 *       409:
 *         description: La categoría ya existe o hay una solicitud pendiente con ese nombre
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryRequestErrorResponse'
 */

router.post(
  "/",
  authenticate,
  requireRole(ROLES.SELLER),
  createCategoryRequest
);

export default router;