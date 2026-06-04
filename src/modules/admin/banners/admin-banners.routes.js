import { Router } from "express";
import authenticate from "../../../config/jwt.config.js";
import { requireRole } from "../../../middlewares/auth.middleware.js";
import { parsePagination } from "../../../middlewares/pagination.middleware.js";
import { validate } from "../../../middlewares/validate.middleware.js";
import { IdParamDTO } from "../../../modules/global/dtos/base/base.param.dto.js";
import {
  AdminCreateBannerDTO,
  AdminUpdateBannerDTO,
  AdminToggleBannerActiveDTO
} from "../../../modules/global/dtos/banners/admin-banner.dto.js";
import { ROLES } from "../../../constants/roles.constant.js";
import {
  createAdminBanner,
  getAdminBanners,
  toggleAdminBannerActive,
  updateAdminBanner,
} from "./admin-banners.controller.js";

const router = Router();

/**
 * @swagger
 * /api/admin/banners:
 *   post:
 *     summary: Crear banner promocional (Admin)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminBannerCreateBody'
 *     responses:
 *       201:
 *         description: Banner creado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminBannerResponse'
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos de administrador
 */
router.post("/", authenticate, requireRole(ROLES.ADMIN), validate(AdminCreateBannerDTO, "body"), createAdminBanner);

/**
 * @swagger
 * /api/admin/banners:
 *   get:
 *     summary: Listar banners promocionales (Admin)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: active
 *         schema:
 *           type: string
 *           enum: [true, false]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [true, false]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de banners
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminBannerListResponse'
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos de administrador
 */
router.get("/", authenticate, requireRole(ROLES.ADMIN), parsePagination, getAdminBanners);

/**
 * @swagger
 * /api/admin/banners/{id}:
 *   put:
 *     summary: Actualizar banner promocional (Admin)
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
 *             $ref: '#/components/schemas/AdminBannerUpdateBody'
 *     responses:
 *       200:
 *         description: Banner actualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminBannerResponse'
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos de administrador
 *       404:
 *         description: Banner no encontrado
 */
router.put("/:id", authenticate, requireRole(ROLES.ADMIN), validate(IdParamDTO, "params"), validate(AdminUpdateBannerDTO, "body"), updateAdminBanner);

/**
 * @swagger
 * /api/admin/banners/{id}/active:
 *   patch:
 *     summary: Activar o desactivar banner (Admin)
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
 *             $ref: '#/components/schemas/AdminBannerToggleBody'
 *     responses:
 *       200:
 *         description: Banner actualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminBannerResponse'
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos de administrador
 *       404:
 *         description: Banner no encontrado
 */
router.patch("/:id/active", authenticate, requireRole(ROLES.ADMIN), validate(IdParamDTO, "params"), validate(AdminToggleBannerActiveDTO, "body"), toggleAdminBannerActive);

export { router as adminBannersRoutes };
