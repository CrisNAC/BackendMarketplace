// src/modules/commerce/deliveries/delivery-assignments/delivery-assignments.controller.js

import { getAvailableDeliveriesForOrderService } from "./delivery-assignments.service.js";

/**
 * GET /api/stores/:storeId/orders/:orderId/deliveries
 * Devuelve los deliveries disponibles de la tienda para delegar el pedido.
 */
export const getAvailableDeliveriesForOrder = async (req, res) => {
  try {
    const { storeId, orderId } = req.params;

    const result = await getAvailableDeliveriesForOrderService(
      req.user?.id_user,
      storeId,
      orderId
    );

    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || error.statusCode || 500).json({
      message: error.message || "Error interno del servidor"
    });
  }
};