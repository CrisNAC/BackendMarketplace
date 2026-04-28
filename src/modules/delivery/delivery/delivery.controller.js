//delivery.controller.js
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
    res.status(error.status || 500).json({ error: error.message });
  }
};

// Login delivery
export const loginDelivery = async (req, res) => {
  try {
    const validData = loginDeliverySchema.parse(req.body);
    const result = await loginDeliveryService(validData.email, validData.password);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

// Crear delivery
export const createDelivery = async (req, res) => {
  try {
    const validData = createDeliverySchema.parse(req.body);
    const result = await createDeliveryService(validData);
    res.status(201).json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

// Actualizar status del delivery
export const updateDeliveryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { delivery_status } = req.body;

    if (!delivery_status || !String(delivery_status).trim()) {
      return res.status(400).json({
        error: {
          code: 400,
          message: "delivery_status es requerido"
        }
      });
    }

    const validData = updateDeliveryStatusSchema.parse(req.body);
    // pasar req.user.id_user
    const result = await updateDeliveryStatusService(
      req.user.id_user, 
      parseInt(id), 
      validData.delivery_status
    );
    
    return res.status(200).json({
      message: "Estado del delivery actualizado exitosamente",
      data: result
    });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

// Obtener asignaciones pendientes del delivery
export const getPendingAssignments = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await getPendingAssignmentsService(parseInt(id));
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

// Editar delivery
export const updateDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const validData = updateDeliverySchema.parse(req.body);
    const result = await updateDeliveryService(parseInt(id), validData);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

// Obtener datos completos del delivery
export const getDeliveryById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await getDeliveryByIdService(parseInt(id));
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

// Obtener todos los deliveries de una tienda
export const getStoreDeliveries = async (req, res) => {
  try {
    const { storeId } = req.params;
    const result = await getStoreDeliveriesService(parseInt(storeId));
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

// Obtener deliveries disponibles de una tienda
export const getAvailableDeliveries = async (req, res) => {
  try {
    const { storeId } = req.params;
    const result = await getAvailableDeliveriesService(parseInt(storeId));
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

// Obtener estadísticas del delivery
export const getDeliveryStats = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await getDeliveryStatsService(parseInt(id));
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

// Eliminar delivery
export const deleteDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await deleteDeliveryService(parseInt(id));
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

// Obtener asignaciones activas
export const getActiveAssignments = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await getActiveAssignmentsService(parseInt(id));
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};