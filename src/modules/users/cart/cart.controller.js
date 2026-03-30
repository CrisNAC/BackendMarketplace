import { addCartItemService, getActiveCartsForUserService } from "./cart.service.js";

/**
 * GET /api/users/:customerId/carts
 * Carritos activos con ítems (uno por comercio).
 */
export const getCarts = async (req, res, next) => {
  try {
    if (!req.user?.id_user) {
      return res.status(401).json({
        success: false,
        message: "Usuario autenticado requerido"
      });
    }

    const { customerId } = req.params;
    const carts = await getActiveCartsForUserService(
      req.user.id_user,
      customerId
    );
    return res.status(200).json({ carts });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/users/:customerId/cart/items
 * Body: { productId, quantity? }
 */
export const addCartItem = async (req, res, next) => {
  try {
    if (!req.user?.id_user) {
      return res.status(401).json({
        success: false,
        message: "Usuario autenticado requerido"
      });
    }

    const { customerId } = req.params;
    const cart = await addCartItemService(
      req.user.id_user,
      customerId,
      req.body
    );
    return res.status(201).json(cart);
  } catch (error) {
    next(error);
  }
};
