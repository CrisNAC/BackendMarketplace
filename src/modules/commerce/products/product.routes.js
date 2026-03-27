import { Router } from "express";
import authenticate from "../../../config/jwt.config.js";
import {
  createProduct,
  filterProducts,
  getProductsSearch,
  getProductById,
  updateProduct,
  deleteProduct,
  compareProducts
} from "./product.controller.js";
import { validate } from "../../../middlewares/validate.middleware.js";
import { FilterProductDTO } from "../../global/dtos/products/product.request.dto.js";
import { parsePagination } from "../../../middlewares/pagination.middleware.js";

const router = Router();

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Crear un producto
 *     tags: [Products]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProductRequest'
 *     responses:
 *       201:
 *         description: Producto creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductResponse'
 *       400:
 *         description: Campos invalidos o faltantes
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
 *         description: El usuario no es vendedor o no tiene comercio activo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/", authenticate, createProduct);

/**
 * @swagger
 * /products/{id}:
 *   put:
 *     summary: Actualizar un producto
 *     tags: [Products]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del producto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProductRequest'
 *     responses:
 *       200:
 *         description: Producto actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductResponse'
 *       400:
 *         description: Sin campos para actualizar o campos invalidos
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
 *         description: No tiene permisos para editar este producto
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Producto no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put("/:id", authenticate, updateProduct);

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     summary: Eliminar un producto (borrado logico)
 *     tags: [Products]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del producto
 *     responses:
 *       204:
 *         description: Producto eliminado correctamente
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: No tiene permisos para eliminar este producto
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Producto no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete("/:id", authenticate, deleteProduct);

/**
 * @swagger
 * /products/filter:
 *   get:
 *     summary: Filtrar productos activos (cliente)
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar por nombre o descripcion
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *         description: Filtrar por ID de categoria
 *       - in: query
 *         name: isOffer
 *         schema:
 *           type: boolean
 *         description: Filtrar productos en oferta
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Precio minimo (inclusive)
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Precio maximo (inclusive)
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
 *         description: Direccion del ordenamiento
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Numero de pagina
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Cantidad de productos por pagina (max. 100)
 *     responses:
 *       200:
 *         description: Lista paginada de productos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductSearchResponse'
 *       400:
 *         description: Parametros invalidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  "/filter",
  parsePagination,
  validate(FilterProductDTO, "query"),
  filterProducts
);

/**
 * @swagger
 * /products/compare/search:
 *   get:
 *     summary: Comparar productos similares por precio entre distintas tiendas
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Termino de busqueda del producto a comparar
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *         description: Filtrar por categoria
 *     responses:
 *       200:
 *         description: Producto base y ofertas similares en otras tiendas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CompareProductsResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/compare/search", compareProducts);

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Obtener un producto por ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del producto
 *     responses:
 *       200:
 *         description: Producto encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductResponse'
 *       404:
 *         description: Producto no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/:id", getProductById);

export default router;
