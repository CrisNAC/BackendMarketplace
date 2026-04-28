import { updateDeliveryStatusService } from "./delivery.service.js";

export const updateDeliveryStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { delivery_status } = req.body;

    if (!delivery_status || !String(delivery_status).trim()) {
      return res.status(400).json({ message: "delivery_status es requerido" });
    }

    const delivery = await updateDeliveryStatusService(req.user.id_user, id, delivery_status);

    return res.status(200).json({
      message: "Estado del delivery actualizado exitosamente",
      data: delivery
    });
  } catch (error) {
    next(error);
  }
};