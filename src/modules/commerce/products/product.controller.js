import { createProductService } from "./product.service.js";

export const createProduct = async (req, res) => {
  try {
    const authenticatedUserId = req.headers["x-user-id"];
    const product = await createProductService(authenticatedUserId, req.body);
    return res.status(201).json(product);
  } catch (error) {
    console.error("Error creando producto:", error);

    return res.status(error.status || 500).json({
      message: error.message || "Error interno del servidor"
    });
  }
};
