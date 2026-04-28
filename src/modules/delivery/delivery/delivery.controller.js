//delivery.controller.js
import {registerDeliverySchema, createDeliverySchema, loginDeliverySchema, updateDeliveryStatusSchema,updateDeliverySchema} from './delivery.validation';
import { registerDeliveryService, createDeliveryService, loginDeliveryService, updateDeliveryStatusService, getPendingAssignmentsService,updateDeliveryService } from './delivery.service';

//registrar delivery
export const registerDelivery = async (req, res) => {
    try{
        //validar con zod
        const validData = registerDeliverySchema.parse(req.body);
        //llamar al service
        const result = await registerDeliveryService(validData);
        // Retornar respuesta
        res.status(201).json(result);
    }catch (error){
        // Manejar errores
        res.status(error.status || 500).json({ error: error.message });
    }
}
// login delivery
export const loginDelivery = async (req, res) => {
  try {
    const validData = loginDeliverySchema.parse(req.body);
    const result = await loginDeliveryService(validData.email, validData.password);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};
//crear delivery
export const createDelivery = async (req, res) => {
  try {
    const validData = createDeliverySchema.parse(req.body);
    const result = await createDeliveryService(validData);
    res.status(201).json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

//actualizar status
export const updateDeliveryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const validData = updateDeliveryStatusSchema.parse(req.body);
    const result = await updateDeliveryStatusService(parseInt(id), validData.delivery_status);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

// obtener asignaciones pendientes
export const getPendingAssignments = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await getPendingAssignmentsService(parseInt(id));
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};
//editar delivery
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

//obtener datos completos del delivery
export const getDeliveryById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await getDeliveryByIdService(parseInt(id));
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
};

//obtener todos los deliveries de una tienda
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