import { Router } from "express";
import authenticate from "../../../config/jwt.config.js";
import { requireRole } from "../../../middlewares/auth.middleware.js";
import { parsePagination } from "../../../middlewares/pagination.middleware.js";
import { ROLES } from "../../../constants/roles.constant.js";
import {
  createBannerRequest,
  getMyBannerRequests,
  deleteBannerRequest,
} from "./banner-request.controller.js";

const router = Router({ mergeParams: true });

/**
 * @swagger
 * /api/stores/{storeId}/banner-requests:
 *   post:
 *     summary: Crear solicitud de banner promocional
 *     description: >
 *       El comercio solicita la publicación de un banner promocional.
 *       La solicitud queda en estado PENDING hasta que el administrador la apruebe o rechace.
 *     tags: [BannerRequests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del comercio
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BannerRequestCreateBody'
 *     responses:
 *       201:
 *         description: Solicitud creada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BannerRequestResponse'
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos sobre este comercio
 *       404:
 *         description: Comercio no encontrado
 */
router.post("/", authenticate, requireRole(ROLES.SELLER), createBannerRequest);

/**
 * @swagger
 * /api/stores/{storeId}/banner-requests:
 *   get:
 *     summary: Ver historial de solicitudes de banner del comercio
 *     tags: [BannerRequests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: approval_status
 *         schema:
 *           type: string
 *           enum: [PENDING, ACTIVE, REJECTED]
 *         description: Filtrar por estado
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
 *         description: Lista de solicitudes del comercio
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BannerRequestListResponse'
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos sobre este comercio
 */
router.get("/", authenticate, requireRole(ROLES.SELLER), parsePagination, getMyBannerRequests);

/**
 * @swagger
 * /api/stores/{storeId}/banner-requests/{requestId}:
 *   delete:
 *     summary: Cancelar solicitud de banner (solo si está PENDING)
 *     tags: [BannerRequests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Solicitud cancelada correctamente
 *       400:
 *         description: La solicitud ya fue procesada y no puede cancelarse
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Sin permisos sobre este comercio
 *       404:
 *         description: Solicitud no encontrada
 */
router.delete("/:requestId", authenticate, requireRole(ROLES.SELLER), deleteBannerRequest);

export default router;
