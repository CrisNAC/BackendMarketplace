import { Router } from "express";
import authenticate from "../../../config/jwt.config.js";
import {
  getWishlist,
  addWishlistItem,
  removeWishlistItem
} from "./wishlist.controller.js";

const router = Router({ mergeParams: true });

// GET    /api/users/:customerId/wishlist                  — obtiene la wishlist del usuario
// POST   /api/users/:customerId/wishlist/items            — agrega producto a la lista
// DELETE /api/users/:customerId/wishlist/items/:productId — elimina producto de la lista
router.get("/:customerId/wishlist", authenticate, getWishlist);
router.post("/:customerId/wishlist/items", authenticate, addWishlistItem);
router.delete("/:customerId/wishlist/items/:productId", authenticate, removeWishlistItem);

export default router;