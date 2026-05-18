// src/modules/users/cart/cart.routes.js

import { Router } from "express";
import authenticate from "../../../config/jwt.config.js";
import { 
  getCarts, 
  addCartItem, 
  getCartItemsById, 
  removeCartItem, 
  updateCartItemQuantity,
  deleteCart,
  deleteAllCarts
} from "./cart.controller.js";

const router = Router({ mergeParams: true });

/**
 * @swagger
 * /api/users/{customerId}/carts:
 *   get:
 *     summary: Obtener todos los carritos activos del usuario
 *     description: |
 *       Retorna una lista de carritos activos del usuario, uno por cada comercio.
 *       Solo se devuelven carritos que tienen al menos un item activo.
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario
 *         example: 1
 *     responses:
 *       200:
 *         description: Lista de carritos activos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetCartsResponse'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CartErrorResponse'
 *       403:
 *         description: No tienes permisos para ver estos carritos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CartValidationError'
 */
router.get("/:customerId/carts", authenticate, getCarts);

/**
 * @swagger
 * /api/users/{customerId}/carts:
 *   delete:
 *     summary: Eliminar todos los carritos activos del usuario
 *     description: |
 *       Elimina todos los carritos activos del usuario (borrado lógico).
 *       Los items del carrito se marcan como inactivos (status=false) en la base de datos.
 *       Los datos se preservan para auditoría pero no se muestran en la UI.
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario propietario de los carritos
 *         example: 1
 *     requestBody:
 *       description: No requiere body
 *       required: false
 *     responses:
 *       200:
 *         description: Todos los carritos fueron eliminados correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeleteAllCartsResponse'
 *       400:
 *         description: No hay carritos para eliminar
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CartErrorResponse'
 *             examples:
 *               noCartsToDelete:
 *                 summary: Sin carritos activos
 *                 value:
 *                   message: "No hay carritos para eliminar"
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CartErrorResponse'
 *       403:
 *         description: No tienes permisos para eliminar estos carritos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CartValidationError'
 */
router.delete("/:customerId/carts", authenticate, deleteAllCarts);

/**
 * @swagger
 * /api/users/{customerId}/cart/items:
 *   post:
 *     summary: Agregar producto al carrito
 *     description: |
 *       Agrega un producto al carrito activo del comercio al que pertenece el producto.
 *       Si el producto ya existe en el carrito, aumenta su cantidad.
 *       Si el carrito no existe, lo crea automáticamente.
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId]
 *             properties:
 *               productId:
 *                 type: integer
 *                 example: 10
 *                 description: ID del producto a agregar
 *               quantity:
 *                 type: integer
 *                 example: 2
 *                 description: Cantidad a agregar (default 1)
 *     responses:
 *       201:
 *         description: Producto agregado al carrito
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 *       400:
 *         description: Datos inválidos o stock insuficiente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CartErrorResponse'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CartErrorResponse'
 *       403:
 *         description: No tienes permisos para modificar este carrito
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CartValidationError'
 *       404:
 *         description: Producto no encontrado o comercio no disponible
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CartErrorResponse'
 */
router.post("/:customerId/cart/items", authenticate, addCartItem);

/**
 * @swagger
 * /api/users/cart/{cartId}/items:
 *   get:
 *     summary: Obtener items de un carrito específico
 *     description: |
 *       Retorna todos los items activos (status=true) de un carrito específico.
 *       Solo el propietario del carrito puede verlo.
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: cartId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del carrito
 *         example: 5
 *     responses:
 *       200:
 *         description: Lista de items del carrito
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   quantity:
 *                     type: integer
 *                     example: 2
 *                   product:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 10
 *                       name:
 *                         type: string
 *                         example: "Laptop Dell"
 *                       price:
 *                         type: number
 *                         example: 1500000
 *                       storeName:
 *                         type: string
 *                         nullable: true
 *                         example: "Electrónica Carlos"
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CartErrorResponse'
 *       404:
 *         description: Carrito no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CartErrorResponse'
 */
router.get("/cart/:cartId/items", authenticate, getCartItemsById);

/**
 * @swagger
 * /api/users/{customerId}/cart/{cartId}:
 *   delete:
 *     summary: Eliminar un carrito específico
 *     description: |
 *       Elimina un carrito específico del usuario (borrado lógico).
 *       Todos los items del carrito se marcan como inactivos (status=false).
 *       Los datos se preservan en la base de datos para auditoría.
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario propietario del carrito
 *         example: 1
 *       - in: path
 *         name: cartId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del carrito a eliminar
 *         example: 5
 *     requestBody:
 *       description: No requiere body
 *       required: false
 *     responses:
 *       200:
 *         description: Carrito eliminado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeleteCartResponse'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CartErrorResponse'
 *       403:
 *         description: No tienes permisos para eliminar este carrito
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CartValidationError'
 *       404:
 *         description: Carrito no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CartErrorResponse'
 */
router.delete("/:customerId/cart/:cartId", authenticate, deleteCart);

/**
 * @swagger
 * /api/users/cart/items/{cartItemId}:
 *   delete:
 *     summary: Eliminar un item del carrito
 *     description: |
 *       Elimina un item específico del carrito (borrado lógico).
 *       El item se marca como inactivo (status=false) pero se preserva en la base de datos.
 *       Retorna el carrito actualizado.
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: cartItemId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del item del carrito a eliminar
 *         example: 1
 *     requestBody:
 *       description: No requiere body
 *       required: false
 *     responses:
 *       200:
 *         description: Item eliminado y carrito actualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CartErrorResponse'
 *       404:
 *         description: Item de carrito no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CartErrorResponse'
 */
router.delete("/cart/items/:cartItemId", authenticate, removeCartItem);

/**
 * @swagger
 * /api/users/cart/items/{cartItemId}:
 *   put:
 *     summary: Actualizar cantidad de un item del carrito
 *     description: |
 *       Actualiza la cantidad de un item específico en el carrito.
 *       Valida que el producto tenga stock suficiente.
 *       Retorna el carrito actualizado.
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: cartItemId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del item del carrito
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantity]
 *             properties:
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 example: 3
 *                 description: Nueva cantidad
 *     responses:
 *       200:
 *         description: Cantidad actualizada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 *       400:
 *         description: Cantidad inválida o stock insuficiente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CartErrorResponse'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CartErrorResponse'
 *       404:
 *         description: Item de carrito no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CartErrorResponse'
 */
router.put("/cart/items/:cartItemId", authenticate, updateCartItemQuantity);

export default router;