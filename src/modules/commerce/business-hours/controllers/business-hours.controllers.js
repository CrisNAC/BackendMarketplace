import {
  getStoreBusinessHoursService,
  updateStoreBusinessHoursService,
} from "../services/business-hours.services.js";

const getErrorStatusCode = (error) => error.statusCode || error.status || 500;

export const getStoreBusinessHours = async (req, res) => {
  try {
    const data = await getStoreBusinessHoursService(req.params.id);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(getErrorStatusCode(error)).json({
      success: false,
      message: error.message || "Error interno del servidor",
    });
  }
};

export const updateStoreBusinessHours = async (req, res) => {
  try {
    const data = await updateStoreBusinessHoursService(
      req.user?.id_user,
      req.params.id,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Horarios del comercio actualizados exitosamente",
      data,
    });
  } catch (error) {
    return res.status(getErrorStatusCode(error)).json({
      success: false,
      message: error.message || "Error interno del servidor",
    });
  }
};
