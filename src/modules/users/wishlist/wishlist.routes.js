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
import { CustomerIdParamDTO, CustomerWishlistIdParamDTO, CustomerWishlistProductIdParamDTO } from "../../global/dtos/common/params.dto.js";
import { CreateWishlistDTO, CreateWishlistItemDTO, UpdateWishlistItemDTO } from "../../global/dtos/wishlists/wishlist.dto.js";

const router = Router({ mergeParams: true });

// ─── Gestión de listas ───────────────────────────────────────────────────────
router.get("/:customerId/wishlists", authenticate, getWishlists);
router.post("/:customerId/wishlists", authenticate, validate(CustomerIdParamDTO, "params"), validate(CreateWishlistDTO, "body"), createWishlist);
router.delete("/:customerId/wishlists/:wishlistId", authenticate, validate(CustomerWishlistIdParamDTO, "params"), deleteWishlist);

// ─── Items de una lista ──────────────────────────────────────────────────────
router.get("/:customerId/wishlists/:wishlistId/items", authenticate, getWishlistItems);
router.post("/:customerId/wishlists/:wishlistId/items", authenticate, validate(CustomerWishlistIdParamDTO, "params"), validate(CreateWishlistItemDTO, "body"), addWishlistItem);
router.put("/:customerId/wishlists/:wishlistId/items/:productId", authenticate, validate(CustomerWishlistProductIdParamDTO, "params"), validate(UpdateWishlistItemDTO, "body"), updateWishlistItemQuantity);
router.delete("/:customerId/wishlists/:wishlistId/items/:productId", authenticate, validate(CustomerWishlistProductIdParamDTO, "params"), removeWishlistItem);

export default router;