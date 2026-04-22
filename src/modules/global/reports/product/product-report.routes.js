import { Router } from "express";
import authenticate from "../../../../config/jwt.config.js";
import { requireRole } from "../../../../middlewares/auth.middleware.js";
import { ROLES } from "../../../../utils/contants/roles.constant.js";
import { parsePagination } from "../../../../middlewares/pagination.middleware.js";
import {
  getProductsReports,
  updateProductReport,
  getProductsReportsFiltered,
  getProductReportReasons,
  createProductReport,
  checkProductReport,
  resolveProductReport,
} from "./product-report.controller.js";


const router = Router({ mergeParams: true });

/**
 * @swagger
 * /api/reports/products:
 *   get:
 *     summary: Obtiene todos los reportes de productos
 *     description: >
 *       El Admin obtiene todos los reportes de productos del sistema.
 *       El Seller solo obtiene los reportes correspondientes a su tienda.
 *     tags: [Product Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de reportes obtenida correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 productsReports:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ProductReport'
 *       401:
 *         description: Usuario autenticado requerido
 *       403:
 *         description: No tenés permiso para acceder a este recurso
 *       404:
 *         description: Usuario o comercio no encontrado
 */
router.get("/products", authenticate, getProductsReports);

/**
 * @swagger
 * /api/reports/products/filtered:
 *   get:
 *     summary: Obtiene reportes de productos con filtros y paginación
 *     description: >
 *       Permite filtrar reportes por estado y buscar por nombre del cliente que reportó.
 *       El Admin ve todos los reportes; el Seller solo ve los de su tienda.
 *     tags: [Product Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: report_status
 *         schema:
 *           type: string
 *           enum: [PENDING, IN_PROGRESS, RESOLVED, REJECTED]
 *         required: false
 *         description: Filtra los reportes por estado
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         required: false
 *         description: Busca por nombre del cliente que realizó el reporte (insensible a mayúsculas)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         required: false
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         required: false
 *         description: Cantidad de resultados por página
 *     responses:
 *       200:
 *         description: Reportes filtrados obtenidos correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 filteredReports:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ProductReport'
 *                     meta:
 *                       $ref: '#/components/schemas/PaginationMeta'
 *       400:
 *         description: Estado inválido
 *       401:
 *         description: Usuario autenticado requerido
 *       403:
 *         description: No tenés permiso para acceder a este recurso
 *       404:
 *         description: Usuario o comercio no encontrado
 */
router.get("/products/filtered", authenticate, parsePagination, getProductsReportsFiltered);

/**
 * @swagger
 * /api/reports/products/{reportId}:
 *   put:
 *     summary: Actualiza el estado de un reporte de producto
 *     description: >
 *       Solo el Seller puede actualizar el estado de un reporte de su tienda.
 *       Las transiciones permitidas son: PENDING → IN_PROGRESS, IN_PROGRESS → RESOLVED o REJECTED.
 *       Al resolver o rechazar un reporte, el campo `notes` es obligatorio.
 *       No se puede modificar un reporte que ya esté en estado RESOLVED o REJECTED.
 *     tags: [Product Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del reporte a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - report_status
 *             properties:
 *               report_status:
 *                 type: string
 *                 enum: [IN_PROGRESS, RESOLVED, REJECTED]
 *                 example: IN_PROGRESS
 *                 description: Nuevo estado del reporte
 *               notes:
 *                 type: string
 *                 example: "Se coordina reenvío del producto"
 *                 description: Nota explicativa. Obligatoria al pasar a RESOLVED o REJECTED
 *     responses:
 *       200:
 *         description: Reporte actualizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 updatedReport:
 *                   type: object
 *                   properties:
 *                     id_product_report:
 *                       type: integer
 *                     report_status:
 *                       type: string
 *                       enum: [PENDING, IN_PROGRESS, RESOLVED, REJECTED]
 *                     notes:
 *                       type: string
 *                       nullable: true
 *                     resolved_at:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     resolver:
 *                       type: object
 *                       properties:
 *                         id_user:
 *                           type: integer
 *                         name:
 *                           type: string
 *       400:
 *         description: Transición de estado inválida o nota faltante al cerrar el reporte
 *       401:
 *         description: Usuario autenticado requerido
 *       403:
 *         description: Solo los Sellers pueden realizar esta acción
 *       404:
 *         description: Reporte, usuario o comercio no encontrado
 */
router.put("/products/:reportId", authenticate, updateProductReport);

// GET /api/reports/products/reasons — Catálogo de motivos (sin auth, usado por el frontend para poblar el select)
router.get("/products/reasons", getProductReportReasons);

// POST /api/reports/products — Cliente reporta un producto
router.post("/products", authenticate, requireRole(ROLES.CUSTOMER), createProductReport);

// GET /api/reports/products/check?productId= — Cliente verifica si ya reportó un producto
router.get("/products/check", authenticate, requireRole(ROLES.CUSTOMER), checkProductReport);

// PATCH /api/reports/products/:reportId/resolve — Admin resuelve o rechaza un reporte
router.patch("/products/:reportId/resolve", authenticate, requireRole(ROLES.ADMIN), resolveProductReport);

export default router;