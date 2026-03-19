import {
  getWishlistService,
  addWishlistItemService,
  removeWishlistItemService
} from "./wishlist.service.js";

export const getWishlist = async (req, res, next) => {
  try {
    if (!req.user?.id_user) {
      return res.status(401).json({
        success: false,
        message: "Usuario autenticado requerido"
      });
    }

    const { customerId } = req.params;
    const wishlist = await getWishlistService(req.user.id_user, customerId);

    return res.status(200).json(wishlist);
  } catch (error) {
    next(error);
  }
};

export const addWishlistItem = async (req, res, next) => {
  try {
    if (!req.user?.id_user) {
      return res.status(401).json({
        success: false,
        message: "Usuario autenticado requerido"
      });
    }

    const { customerId } = req.params;
    const wishlist = await addWishlistItemService(
      req.user.id_user,
      customerId,
      req.body
    );

    return res.status(201).json(wishlist);
  } catch (error) {
    next(error);
  }
};

export const removeWishlistItem = async (req, res, next) => {
  try {
    if (!req.user?.id_user) {
      return res.status(401).json({
        success: false,
        message: "Usuario autenticado requerido"
      });
    }

    const { customerId, productId } = req.params;
    await removeWishlistItemService(req.user.id_user, customerId, productId);

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
};