import { Router } from "express";
import { getActiveBanners } from "./banners.controller.js";

const router = Router();

/**
 * @swagger
 * /api/banners:
 *   get:
 *     summary: Obtener banners activos para el homepage
 *     tags: [Banners]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de banners activos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BannerPublicListResponse'
 */
router.get("/", getActiveBanners);

export { router as bannerRoutes };
