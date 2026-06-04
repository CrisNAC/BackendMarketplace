import { Router } from "express";
import authenticate from "../../../config/jwt.config.js";
import { requireRole } from "../../../middlewares/auth.middleware.js";
import { parsePagination } from "../../../middlewares/pagination.middleware.js";
import { ROLES } from "../../../constants/roles.constant.js";
import {
  createAdminBanner,
  getAdminBanners,
  toggleAdminBannerActive,
  updateAdminBanner,
  getBannerRequests,
  processBannerRequest,
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
router.post("/", authenticate, requireRole(ROLES.ADMIN), createAdminBanner);

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
router.put("/:id", authenticate, requireRole(ROLES.ADMIN), updateAdminBanner);

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
router.patch("/:id/active", authenticate, requireRole(ROLES.ADMIN), toggleAdminBannerActive);

/**
 * @swagger
 * /api/admin/banner-requests:
 *   get:
 *     summary: Listar solicitudes de banners por comercios (Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: approval_status
 *         schema:
 *           type: string
 *           enum: [PENDING, ACTIVE, REJECTED]
 *         description: Filtrar por estado (por defecto PENDING)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por título o nombre del comercio
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
 *         description: Lista de solicitudes
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos de administrador
 */
router.get("/requests", authenticate, requireRole(ROLES.ADMIN), parsePagination, getBannerRequests);

/**
 * @swagger
 * /api/admin/banner-requests/{id}:
 *   patch:
 *     summary: Aprobar o rechazar solicitud de banner (Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la solicitud de banner
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - decision
 *             properties:
 *               decision:
 *                 type: string
 *                 enum: [APPROVE, REJECT]
 *               rejectionReason:
 *                 type: string
 *                 description: Requerido si decision es REJECT
 *     responses:
 *       200:
 *         description: Solicitud procesada correctamente
 *       400:
 *         description: Decisión inválida o solicitud ya procesada
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos de administrador
 *       404:
 *         description: Solicitud no encontrada
 */
router.patch("/requests/:id", authenticate, requireRole(ROLES.ADMIN), processBannerRequest);

export { router as adminBannersRoutes };
