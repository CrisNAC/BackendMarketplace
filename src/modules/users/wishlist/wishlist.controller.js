import {
  getWishlistsService,
  createWishlistService,
  deleteWishlistService,
  getWishlistItemsService,
  addWishlistItemService,
  updateWishlistItemQuantityService,
  removeWishlistItemService
} from "./wishlist.service.js";

const getAuthenticatedUserId = (req, res) => {
  if (!req.user?.id_user) {
    res.status(401).json({ success: false, message: "Usuario autenticado requerido" });
    return null;
  }
  return req.user.id_user;
};

// ─── Gestión de listas ───────────────────────────────────────────────────────

export const getWishlists = async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req, res);
    if (!userId) return;
    const wishlists = await getWishlistsService(userId, req.params.customerId);
    return res.status(200).json(wishlists);
  } catch (error) {
    next(error);
  }
};

export const createWishlist = async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req, res);
    if (!userId) return;
    const wishlist = await createWishlistService(userId, req.params.customerId, req.body);
    return res.status(201).json(wishlist);
  } catch (error) {
    next(error);
  }
};

export const deleteWishlist = async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req, res);
    if (!userId) return;
    await deleteWishlistService(userId, req.params.customerId, req.params.wishlistId);
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// ─── Items de una lista ──────────────────────────────────────────────────────

export const getWishlistItems = async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req, res);
    if (!userId) return;
    const wishlist = await getWishlistItemsService(userId, req.params.customerId, req.params.wishlistId);
    return res.status(200).json(wishlist);
  } catch (error) {
    next(error);
  }
};

export const addWishlistItem = async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req, res);
    if (!userId) return;
    const wishlist = await addWishlistItemService(
      userId,
      req.params.customerId,
      req.params.wishlistId,
      req.body
    );
    return res.status(201).json(wishlist);
  } catch (error) {
    next(error);
  }
};

export const updateWishlistItemQuantity = async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req, res);
    if (!userId) return;
    const wishlist = await updateWishlistItemQuantityService(
      userId,
      req.params.customerId,
      req.params.wishlistId,
      req.params.productId,
      req.body
    );
    return res.status(200).json(wishlist);
  } catch (error) {
    next(error);
  }
};

export const removeWishlistItem = async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req, res);
    if (!userId) return;
    await removeWishlistItemService(
      userId,
      req.params.customerId,
      req.params.wishlistId,
      req.params.productId
    );
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
};