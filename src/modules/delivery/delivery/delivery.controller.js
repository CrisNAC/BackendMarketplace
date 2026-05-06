//delivery.controller.js
import { ZodError } from 'zod';
import {
  registerDeliverySchema,
  updateDeliveryStatusSchema,
  updateDeliveryProfileSchema
} from './delivery.validation.js';
import {
  registerDeliveryService,
  updateDeliveryStatusService,
  getPendingAssignmentsService,
  getDeliveryByIdService,
  updateDeliveryProfileService
} from './delivery.service.js';

// Registrar delivery
export const registerDelivery = async (req, res) => {
  try {
    const validData = registerDeliverySchema.parse(req.body);
    const result = await registerDeliveryService(req.user, validData);
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: { code: 400, message: "Datos inválidos", details: error.issues }
      });
    }
    return res.status(error.status || 500).json({
      error: { code: error.status || 500, message: error.message }
    });
  }
};

// Actualizar status del delivery
export const updateDeliveryStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const deliveryId = Number.parseInt(id, 10);
    if (Number.isNaN(deliveryId)) {
      return res.status(400).json({
        error: { code: 400, message: "ID inválido" }
      });
    }

    const validData = updateDeliveryStatusSchema.parse(req.body);

    const result = await updateDeliveryStatusService(
      req.user.id_user,
      deliveryId,
      validData.delivery_status
    );

    return res.status(200).json({
      message: "Estado del delivery actualizado exitosamente",
      data: result
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: {
          code: 400,
          message: error.issues[0].message,
          details: error.issues
        }
      });
    }
    return res.status(error.status || 500).json({
      error: { code: error.status || 500, message: error.message }
    });
  }
};

// Obtener asignaciones pendientes del delivery
export const getPendingAssignments = async (req, res) => {
  try {
    const { id } = req.params;

    const deliveryId = Number.parseInt(id, 10);
    if (Number.isNaN(deliveryId)) {
      return res.status(400).json({
        error: { code: 400, message: "ID inválido" }
      });
    }

    const result = await getPendingAssignmentsService(deliveryId, req.user.id_user);
    res.json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.status || 500, message: error.message }
    });
  }
};


// Obtener datos completos del delivery
export const getDeliveryById = async (req, res) => {
  try {
    const { id } = req.params;

    const deliveryId = Number.parseInt(id, 10);
    if (Number.isNaN(deliveryId)) {
      return res.status(400).json({
        error: { code: 400, message: "ID inválido" }
      });
    }

    const result = await getDeliveryByIdService(deliveryId);
    res.json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.status || 500, message: error.message }
    });
  }
};

// Actualizar perfil del delivery
export const updateDeliveryProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const deliveryId = Number.parseInt(id, 10);
    if (Number.isNaN(deliveryId)) {
      return res.status(400).json({
        error: { code: 400, message: "ID inválido" }
      });
    }

    const validData = updateDeliveryProfileSchema.parse(req.body);
    const file = req.file;

    const result = await updateDeliveryProfileService(
      deliveryId,
      req.user,
      validData,
      file
    );

    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: {
          code: 400,
          message: error.issues[0].message,
          details: error.issues
        }
      });
    }
    return res.status(error.status || 500).json({
      error: { code: error.status || 500, message: error.message }
    });
  }
};

