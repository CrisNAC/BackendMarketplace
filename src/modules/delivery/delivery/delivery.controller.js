//delivery.controller.js
import { ZodError } from 'zod';
import {
  registerDeliverySchema,
  createDeliverySchema,
  loginDeliverySchema,
  updateDeliveryStatusSchema,
  updateDeliverySchema
} from './delivery.validation.js';
import {
  registerDeliveryService,
  createDeliveryService,
  loginDeliveryService,
  updateDeliveryStatusService,
  getPendingAssignmentsService,
  updateDeliveryService,
  getDeliveryByIdService,
  getStoreDeliveriesService,
  getAvailableDeliveriesService,
  getDeliveryStatsService,
  deleteDeliveryService,
  getActiveAssignmentsService
} from './delivery.service.js';

// Registrar delivery
export const registerDelivery = async (req, res) => {
  try {
    const validData = registerDeliverySchema.parse(req.body);
    const result = await registerDeliveryService(validData);
    res.status(201).json(result);
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

// Login delivery
export const loginDelivery = async (req, res) => {
  try {
    const validData = loginDeliverySchema.parse(req.body);
    const result = await loginDeliveryService(validData.email, validData.password);
    res.json(result);
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

// Crear delivery
export const createDelivery = async (req, res) => {
  try {
    const validData = createDeliverySchema.parse(req.body);
    const result = await createDeliveryService(validData);
    res.status(201).json(result);
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

    const result = await getPendingAssignmentsService(deliveryId);
    res.json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.status || 500, message: error.message }
    });
  }
};

// Editar delivery
export const updateDelivery = async (req, res) => {
  try {
    const validData = updateDeliverySchema.parse(req.body);
    const result = await updateDeliveryService(req.user.id_user, validData);
    res.json(result);
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

// Obtener todos los deliveries de una tienda
export const getStoreDeliveries = async (req, res) => {
  try {
    const { storeId } = req.params;

    const storeIdNum = Number.parseInt(storeId, 10);
    if (Number.isNaN(storeIdNum)) {
      return res.status(400).json({
        error: { code: 400, message: "ID inválido" }
      });
    }

    const result = await getStoreDeliveriesService(storeIdNum);
    res.json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.status || 500, message: error.message }
    });
  }
};

// Obtener deliveries disponibles de una tienda
export const getAvailableDeliveries = async (req, res) => {
  try {
    const { storeId } = req.params;

    const storeIdNum = Number.parseInt(storeId, 10);
    if (Number.isNaN(storeIdNum)) {
      return res.status(400).json({
        error: { code: 400, message: "ID inválido" }
      });
    }

    const result = await getAvailableDeliveriesService(storeIdNum);
    res.json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.status || 500, message: error.message }
    });
  }
};

// Obtener estadísticas del delivery
export const getDeliveryStats = async (req, res) => {
  try {
    const { id } = req.params;

    const deliveryId = Number.parseInt(id, 10);
    if (Number.isNaN(deliveryId)) {
      return res.status(400).json({
        error: { code: 400, message: "ID inválido" }
      });
    }

    const result = await getDeliveryStatsService(deliveryId);
    res.json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.status || 500, message: error.message }
    });
  }
};

// Eliminar delivery
export const deleteDelivery = async (req, res) => {
  try {
    const { id } = req.params;

    const deliveryId = Number.parseInt(id, 10);
    if (Number.isNaN(deliveryId)) {
      return res.status(400).json({
        error: { code: 400, message: "ID inválido" }
      });
    }

    const result = await deleteDeliveryService(deliveryId);
    res.json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.status || 500, message: error.message }
    });
  }
};

// Obtener asignaciones activas
export const getActiveAssignments = async (req, res) => {
  try {
    const { id } = req.params;

    const deliveryId = Number.parseInt(id, 10);
    if (Number.isNaN(deliveryId)) {
      return res.status(400).json({
        error: { code: 400, message: "ID inválido" }
      });
    }

    const result = await getActiveAssignmentsService(deliveryId);
    res.json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.status || 500, message: error.message }
    });
  }
};