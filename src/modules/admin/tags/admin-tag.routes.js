import { Router } from "express";
import authenticate from "../../../config/jwt.config.js";
import { requireRole } from "../../../middlewares/auth.middleware.js";
import { validate } from "../../../middlewares/validate.middleware.js";
import { IdParamDTO } from "../../../modules/global/dtos/base/base.param.dto.js";
import {
  AdminCreateTagDTO,
  AdminUpdateTagDTO
} from "../../../modules/global/dtos/product-tags/admin-tag.dto.js";
import {
  createAdminTag,
  getAdminTags,
  updateAdminTag,
  deleteAdminTag
} from "./admin-tag.controller.js";
import { ROLES } from "../../../constants/roles.constant.js";

const router = Router();

/**
 * @swagger
 * /api/admin/tags:
 *   post:
 *     summary: Crear etiqueta de producto (Admin)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 20
 *                 example: Orgánico
 *     responses:
 *       201:
 *         description: Etiqueta creada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 status:
 *                   type: boolean
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Nombre inválido o etiqueta activa duplicada
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos de administrador
 */
router.post("/", authenticate, requireRole(ROLES.ADMIN), validate(AdminCreateTagDTO, "body"), createAdminTag);

/**
 * @swagger
 * /api/admin/tags:
 *   get:
 *     summary: Listar etiquetas de producto (Admin)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Lista de etiquetas activas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   status:
 *                     type: boolean
 *                   productCount:
 *                     type: integer
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos de administrador
 */
router.get("/", authenticate, requireRole(ROLES.ADMIN), getAdminTags);

/**
 * @swagger
 * /api/admin/tags/{id}:
 *   patch:
 *     summary: Editar nombre de etiqueta de producto (Admin)
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
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 20
 *                 example: Vegano
 *     responses:
 *       200:
 *         description: Etiqueta actualizada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 status:
 *                   type: boolean
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Nombre inválido o etiqueta activa duplicada
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos de administrador
 *       404:
 *         description: Etiqueta no encontrada
 */
router.patch("/:id", authenticate, requireRole(ROLES.ADMIN), validate(IdParamDTO, "params"), validate(AdminUpdateTagDTO, "body"), updateAdminTag);

/**
 * @swagger
 * /api/admin/tags/{id}:
 *   delete:
 *     summary: Eliminar etiqueta de producto (Admin)
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
 *         description: Etiqueta eliminada correctamente
 *       400:
 *         description: ID inválido
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos de administrador
 *       404:
 *         description: Etiqueta no encontrada
 */
router.delete("/:id", authenticate, requireRole(ROLES.ADMIN), validate(IdParamDTO, "params"), deleteAdminTag);

export { router as adminTagRoutes };
