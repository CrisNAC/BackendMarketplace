// src/modules/commerce/deliveries/delivery/delivery.controller.js
import {
  searchDeliveryCandidatesService,
  createDeliveryService
} from "./delivery.service.js";

export const searchDeliveries = async (req, res) => {
  try {
    const { q } = req.query;
    const candidates = await searchDeliveryCandidatesService(q);
    res.status(200).json(candidates);
  } catch (error) {
    return res.status(error.status || error.statusCode || 500).json({
      message: error.message || "Error interno del servidor"
    });
  }
};

export const createDelivery = async (req, res) => {
  try {
    const { id } = req.params; // store id
    const { fk_user } = req.body; // user id to link

    if (!fk_user) {
      return res.status(400).json({ message: "fk_user es requerido" });
    }

    const fkUser = Number(fk_user);
    if (!Number.isInteger(fkUser) || fkUser <= 0) {
      return res.status(400).json({ message: "fk_user debe ser un id numérico válido" });
    }

    const delivery = await createDeliveryService(req.user?.id_user, id, fkUser);
    res.status(201).json(delivery);
  } catch (error) {
    return res.status(error.status || error.statusCode || 500).json({
      message: error.message || "Error interno del servidor"
    });
  }
};
