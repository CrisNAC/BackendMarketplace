import { Router } from "express";
import authenticate from "../../../config/jwt.config.js";
import {
    createStore,
    updateStore,
    getStoreById,
    getStores,
    getAllProductsByStore,
    filterStoreProducts,
    updateStoreStatus,
    deleteStore
} from "./store.controller.js";
import { parsePagination } from "../../../middlewares/pagination.middleware.js";
import { validate } from "../../../middlewares/validate.middleware.js";
import { FilterStoreProductsDTO } from "../../global/dtos/commerce/filter-store-products.dto.js";

const router = Router();

/**
 * @swagger
 * /api/commerces:
 *   post:
 *     summary: Crear un comercio
 *     tags: [Commerces]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateStoreRequest'
 *     responses:
 *       201:
 *         description: Comercio creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StoreResponse'
 *       400:
 *         description: Campos inválidos o faltantes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: El usuario ya tiene un comercio o email ya registrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/", authenticate, createStore);

/**
 * @swagger
 * /api/commerces/{id}:
 *   put:
 *     summary: Actualizar un comercio
 *     tags: [Commerces]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del comercio
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateStoreRequest'
 *     responses:
 *       200:
 *         description: Comercio actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Comercio actualizado exitosamente
 *                 data:
 *                   $ref: '#/components/schemas/StoreResponse'
 *       400:
 *         description: Sin campos para actualizar o campos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: No tiene permisos para editar este comercio
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Comercio no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put("/:id", authenticate, updateStore);

/**
 * @swagger
 * /api/commerces:
 *   get:
 *     summary: Listar comercios activos
 *     tags: [Commerces]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por nombre o descripción
 *       - in: query
 *         name: storeCategoryId
 *         schema:
 *           type: integer
 *         description: Filtrar por categoría de comercio
 *     responses:
 *       200:
 *         description: Lista de comercios
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/StoreListItemResponse'
 *       400:
 *         description: Parámetros inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/", getStores);

/**
 * @swagger
 * /api/commerces/{id}:
 *   get:
 *     summary: Obtener un comercio por ID
 *     tags: [Commerces]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del comercio
 *     responses:
 *       200:
 *         description: Comercio encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StoreResponse'
 *       404:
 *         description: Comercio no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/:id", getStoreById);

/**
 * @swagger
 * /api/commerces/products/{id}:
 *   get:
 *     summary: Obtener todos los productos activos de un comercio
 *     tags: [Commerces]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del comercio
 *     responses:
 *       200:
 *         description: Lista de productos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/StoreProductResponse'
 *       404:
 *         description: Comercio no encontrado o sin productos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/products/:id", getAllProductsByStore);

/**
 * @swagger
 * /api/commerces/products/filter/{id}:
 *   get:
 *     summary: Filtrar productos de un comercio
 *     tags: [Commerces]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del comercio
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Filtrar por nombre del producto
 *       - in: query
 *         name: category
 *         schema:
 *           type: integer
 *         description: Filtrar por ID de categoría
 *       - in: query
 *         name: price_min
 *         schema:
 *           type: number
 *         description: Precio mínimo
 *       - in: query
 *         name: price_max
 *         schema:
 *           type: number
 *         description: Precio máximo
 *       - in: query
 *         name: available
 *         schema:
 *           type: boolean
 *         description: Filtrar solo productos visibles/disponibles
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [created_at, price, name]
 *           default: created_at
 *         description: Campo por el que ordenar
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Dirección del ordenamiento
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Cantidad de productos por página (máx. 100)
 *     responses:
 *       200:
 *         description: Productos filtrados con paginación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StoreProductsPageResponse'
 *       400:
 *         description: Parámetros inválidos o price_min mayor que price_max
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Comercio no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
    "/products/filter/:id",
    parsePagination,
    validate(FilterStoreProductsDTO, "query"),
    filterStoreProducts
);

// PATCH /api/commerces/:id/status — habilitar/deshabilitar comercio
router.patch("/:id/status", authenticate, updateStoreStatus);

/**
 * @swagger
 * /api/commerces/{id}:
 *   delete:
 *     summary: Eliminar un comercio (borrado lógico)
 *     tags: [Commerces]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del comercio
 *     responses:
 *       204:
 *         description: Comercio eliminado correctamente
 *       400:
 *         description: ID de comercio inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: No tiene permisos para eliminar este comercio
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Comercio no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete("/:id", deleteStore);

export default router;