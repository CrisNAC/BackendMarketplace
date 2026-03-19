import { createOrderService, getOrdersService } from "./order.service.js";

export const createOrder = async (req, res, next) => {
  try {
    if (!req.user?.id_user) {
      return res.status(401).json({
        success: false,
        message: "Usuario autenticado requerido"
      });
    }

    const order = await createOrderService(req.user.id_user, req.body);
    return res.status(201).json(order);
  } catch (error) {
    next(error);
  }
};

export const getOrders = async (req, res, next) => {
  try {
    if (!req.user?.id_user) {
      return res.status(401).json({
        success: false,
        message: "Usuario autenticado requerido"
      });
    }

    const { customerId } = req.params;
    const orders = await getOrdersService(req.user.id_user, customerId);
    return res.status(200).json(orders);
  } catch (error) {
    next(error);
  }
};