import { 
  createProductService, getProductsSearchService,
  getProductByIdService 
} from "./product.service.js";

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

export const getProductById = async (req, res) => {
  try {
    const product = await getProductByIdService(req.params.id);
    return res.status(200).json(product);
  } catch (error) {
    console.error("Error obteniendo producto:", error);
    return res.status(error.status || 500).json({
      message: error.message || "Error interno del servidor"
    });
  }
};

/** GET: Para obtener todos losproductos o buscar segun nombre o descripcion (por el momento).
 * Recibe query con parametros de nombre o descripcion del producto y retorna una lista de productos. 
 * 
 * http://localhost:3000/products?search=escritorio&page=1&limit=5
 * 
 * Obs.: Este endpoint se puede usar para traer todos los productos (con status=true y visible=true), basta con pasarle vacio los parametros*/
export const getProductsSearch = async (request, response) => {
  try {
    const filterProducts = await getProductsSearchService(request.query);
    console.info("Obteniendo productos...")
    return response.status(200).json(filterProducts);
  }
  catch (error) {
    console.error("Error al obtener productos:", error);
    return response.status(error.status || 500).json({message: error.message || "Error interno del servidor."});
  }
};