import { Router } from "express";
import authenticate from "../../../config/jwt.config.js";
import {
  getWishlists,
  createWishlist,
  deleteWishlist,
  getWishlistItems,
  addWishlistItem,
  updateWishlistItemQuantity,
  removeWishlistItem
} from "./wishlist.controller.js";

const router = Router({ mergeParams: true });

// ─── Gestión de listas ───────────────────────────────────────────────────────
// GET    /api/users/:customerId/wishlists                                  → listar todas las listas del usuario
// POST   /api/users/:customerId/wishlists                                  → crear nueva lista (body: { name })
// DELETE /api/users/:customerId/wishlists/:wishlistId                      → eliminar lista
router.get("/:customerId/wishlists", authenticate, getWishlists);
router.post("/:customerId/wishlists", authenticate, createWishlist);
router.delete("/:customerId/wishlists/:wishlistId", authenticate, deleteWishlist);

// ─── Items de una lista ──────────────────────────────────────────────────────
// GET    /api/users/:customerId/wishlists/:wishlistId/items                → ver productos de la lista
// POST   /api/users/:customerId/wishlists/:wishlistId/items                → agregar producto (body: { productId, quantity })
// PUT    /api/users/:customerId/wishlists/:wishlistId/items/:productId     → actualizar cantidad (body: { quantity })
// DELETE /api/users/:customerId/wishlists/:wishlistId/items/:productId     → quitar producto
router.get("/:customerId/wishlists/:wishlistId/items", authenticate, getWishlistItems);
router.post("/:customerId/wishlists/:wishlistId/items", authenticate, addWishlistItem);
router.put("/:customerId/wishlists/:wishlistId/items/:productId", authenticate, updateWishlistItemQuantity);
router.delete("/:customerId/wishlists/:wishlistId/items/:productId", authenticate, removeWishlistItem);

export default router;