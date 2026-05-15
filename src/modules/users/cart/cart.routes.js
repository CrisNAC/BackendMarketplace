//cart.routes.js
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

// GET /api/users/:customerId/carts — lista carritos activos por comercio
router.get("/:customerId/carts", authenticate, getCarts);

// DELETE /api/users/:customerId/carts — elimina todos los carritos activos del usuario
router.delete("/:customerId/carts", authenticate, deleteAllCarts);

// POST /api/users/:customerId/cart/items — agrega producto al carrito del comercio correspondiente
router.post("/:customerId/cart/items", authenticate, addCartItem);

// GET /api/users/cart/:cartId/items - obtiene los items de un carrito especifico
router.get("/cart/:cartId/items", authenticate, getCartItemsById);

// DELETE /api/users/:customerId/cart/:cartId — elimina un carrito específico
router.delete("/:customerId/cart/:cartId", authenticate, deleteCart);

// DELETE /api/users/cart/items/:cartItemId - elimina un item del carrito de compras
router.delete("/cart/items/:cartItemId", authenticate, removeCartItem);

// PUT /api/users/cart/items/:cartItemId - actualiza la cantidad de un item del carrito de compras
router.put("/cart/items/:cartItemId", authenticate, updateCartItemQuantity);

export default router;