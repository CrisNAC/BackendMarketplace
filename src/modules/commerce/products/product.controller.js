import {
  createProductService,
  getProductsSearchService,
  getProductByIdService,
  updateProductService,
  deleteProductService
} from "./product.service.js";

export const createProduct = async (req, res) => {
  try {
    if (!req.user?.id_user) {
      return res.status(401).json({
        success: false,
        message: "Usuario autenticado requerido"
      });
    }

    const product = await createProductService(req.user.id_user, req.body);
    return res.status(201).json(product);
  } catch (error) {
    console.error("Error creando producto:", error);

    return res.status(error.status || 500).json({
      message: error.message || "Error interno del servidor"
    });
  }
};

export const updateProduct = async (req, res) => {
  try {
    if (!req.user?.id_user) {
      return res.status(401).json({
        success: false,
        message: "Usuario autenticado requerido"
      });
    }

    const { id } = req.params;
    const product = await updateProductService(req.user.id_user, id, req.body);

    return res.status(200).json(product);
  } catch (error) {
    console.error("Error actualizando producto:", error);

    return res.status(error.status || error.statusCode || 500).json({
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

export const deleteProduct = async (req, res, next) => {
  try {
    if (!req.user?.id_user) {
      return res.status(401).json({
        success: false,
        message: "Usuario autenticado requerido"
      });
    }

    await deleteProductService(req.user.id_user, req.params.id);
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
};

//obtener producto por id
export const getProductById = async (request, response) => {

  try {
    const { id } = request.params;
    const product = await getProductByIdService(id);
    if(!product){
      return response.status(404).json({
        message:"Producto no encontrado"
      });
    }
    console.info("Obteniendo producto por id...");
    return response.status(200).json(product);
  }
  catch(error){
    console.error("Error al obtener producto:", error);
    return response.status(error.status || 500).json({
      message:error.message || "Error interno del servidor."
    });
  }
};
