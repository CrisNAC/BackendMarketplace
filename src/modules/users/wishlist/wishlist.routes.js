import { Router } from "express";
import authenticate from "../../../config/jwt.config.js";
import { validate } from "../../../middlewares/validate.middleware.js";
import {
  getWishlists,
  createWishlist,
  deleteWishlist,
  getWishlistItems,
  addWishlistItem,
  updateWishlistItemQuantity,
  removeWishlistItem
} from "./wishlist.controller.js";
import { CustomerIdParamDTO, WishlistIdParamDTO, ProductIdParamDTO } from "../../global/dtos/common/params.dto.js";
import { CreateWishlistDTO, CreateWishlistItemDTO, UpdateWishlistItemDTO } from "../../global/dtos/wishlists/wishlist.dto.js";

const router = Router({ mergeParams: true });

// ─── Gestión de listas ───────────────────────────────────────────────────────
// GET    /api/users/:customerId/wishlists                                  → listar todas las listas del usuario
// POST   /api/users/:customerId/wishlists                                  → crear nueva lista (body: { name })
// DELETE /api/users/:customerId/wishlists/:wishlistId                      → eliminar lista
router.get("/:customerId/wishlists", authenticate, getWishlists);
router.post("/:customerId/wishlists", authenticate, validate(CustomerIdParamDTO, "params"), validate(CreateWishlistDTO, "body"), createWishlist);
router.delete("/:customerId/wishlists/:wishlistId", authenticate, validate(CustomerIdParamDTO, "params"), validate(WishlistIdParamDTO, "params"), deleteWishlist);

// ─── Items de una lista ──────────────────────────────────────────────────────
// GET    /api/users/:customerId/wishlists/:wishlistId/items                → ver productos de la lista
// POST   /api/users/:customerId/wishlists/:wishlistId/items                → agregar producto (body: { productId, quantity })
// PUT    /api/users/:customerId/wishlists/:wishlistId/items/:productId     → actualizar cantidad (body: { quantity })
// DELETE /api/users/:customerId/wishlists/:wishlistId/items/:productId     → quitar producto
router.get("/:customerId/wishlists/:wishlistId/items", authenticate, getWishlistItems);
router.post("/:customerId/wishlists/:wishlistId/items", authenticate, validate(CustomerIdParamDTO, "params"), validate(WishlistIdParamDTO, "params"), validate(CreateWishlistItemDTO, "body"), addWishlistItem);
router.put("/:customerId/wishlists/:wishlistId/items/:productId", authenticate, validate(CustomerIdParamDTO, "params"), validate(WishlistIdParamDTO, "params"), validate(ProductIdParamDTO, "params"), validate(UpdateWishlistItemDTO, "body"), updateWishlistItemQuantity);
router.delete("/:customerId/wishlists/:wishlistId/items/:productId", authenticate, validate(CustomerIdParamDTO, "params"), validate(WishlistIdParamDTO, "params"), validate(ProductIdParamDTO, "params"), removeWishlistItem);

export default router;