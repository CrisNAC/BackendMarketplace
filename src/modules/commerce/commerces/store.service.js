// src/modules/commerce/commerces/store.service.js
import { prisma } from "../../../lib/prisma.js";

/**
 * Servicio para crear un nuevo comercio. Realiza validaciones y verifica que el usuario sea un vendedor sin tienda previa.
 * @param {*} data 
 * @returns 
 */
export const createStoreService = async (data) => {
  const {
    fk_user,
    fk_store_category,
    name,
    email,
    phone,
    description,
    logo,
    website_url,
    instagram_url,
    tiktok_url,
    address,
    city,
    region,
    postal_code
  } = data;

  // validaciones básicas
  if (!fk_user || !fk_store_category || !name || !email || !phone || !address || !city || !region) {
    throw { status: 400, message: "Faltan campos obligatorios" };
  }

  if (!Number.isInteger(fk_user) || fk_user <= 0) {
    throw { status: 400, message: "fk_user inválido" };
  }

  if (!Number.isInteger(fk_store_category) || fk_store_category <= 0) {
    throw { status: 400, message: "fk_store_category inválido" };
  }

  if (!name || typeof name !== "string" || !name.trim()) {
    throw { status: 400, message: "El nombre es obligatorio" };
  }

  if (name.trim().length > 100) {
    throw { status: 400, message: "El nombre es demasiado largo" };
  }

  if (!email || typeof email !== "string" || !email.trim()) {
    throw { status: 400, message: "El email es obligatorio" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    throw { status: 400, message: "Formato de email inválido" };
  }

  if (!phone || typeof phone !== "string" || !phone.trim()) {
    throw { status: 400, message: "El teléfono es obligatorio" };
  }

  if (phone.length > 20) {
    throw { status: 400, message: "El teléfono es demasiado largo" };
  }

  if (!address || typeof address !== "string" || !address.trim()) {
    throw { status: 400, message: "La dirección es obligatoria" };
  }

  if (!city || typeof city !== "string" || !city.trim()) {
    throw { status: 400, message: "La ciudad es obligatoria" };
  }

  if (!region || typeof region !== "string" || !region.trim()) {
    throw { status: 400, message: "La región es obligatoria" };
  }

  try {

    // verificar que el usuario exista
    const usuario = await prisma.users.findUnique({
      where: { id_user: fk_user }
    });

    if (!usuario) {
      throw { status: 404, message: "Usuario no encontrado" };
    }

    // vrificar que sea SELLER
    // if (usuario.role !== "SELLER") {
    //   throw { status: 403, message: "El usuario no es vendedor" };
    // }

    // verificar que no tenga tienda
    const tiendaExistente = await prisma.stores.findUnique({
      where: { fk_user }
    });

    if (tiendaExistente) {
      throw { status: 409, message: "El usuario ya tiene un comercio" };
    }

    //verificar categoría
    const categoria = await prisma.storeCategories.findUnique({
      where: { id_store_category: fk_store_category }
    });

    // if (!categoria) {
    //   throw { status: 400, message: "Categoría no válida" };
    // }

    //creear tienda
    const nuevaTienda = await prisma.$transaction(async (tx) => {

      const store = await tx.stores.create({
        data: {
          fk_user,
          fk_store_category,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          description,
          logo,
          website_url,
          instagram_url,
          tiktok_url
        }
      });

      await tx.addresses.create({
        data: {
          fk_user,
          fk_store: store.id_store,
          address: address.trim(),
          city: city.trim(),
          region: region.trim(),
          postal_code
        }
      });

      // Actualizamos rol del usuario a SELLER al crearse el comercio
      await tx.users.update({
        where: { id_user: fk_user },
        data: { role: "SELLER" }
    });

      return store;
    });

    return nuevaTienda;

  } catch (error) {

    if (error.code === "P2002") {
      throw { status: 409, message: "Email ya registrado" };
    }

    throw error;
  }
};

/**
 * Obtiene un comercio por su ID, incluyendo datos del vendedor, categoría, productos visibles y direcciones activas. Realiza validaciones básicas y maneja errores.
 * @param {*} id_store 
 * @returns 
 */
export const getStoreByIdService = async (id_store) => {
  try {
    // validaciones básicas
    if (!id_store) {
      throw { status: 400, message: "ID de tienda es requerido" };
    }
    if (isNaN(Number(id_store))) {
      throw { status: 400, message: "ID de tienda debe ser un número" };
    }

    // Buscar comercio 
    const store = await prisma.stores.findUnique({
      where: { id_store: Number(id_store) },
      // Datos del comercio
      select: {
        id_store: true,
        name: true,
        description: true,
        logo: true,
        phone: true,
        email: true,
        website_url: true,
        instagram_url: true,
        tiktok_url: true,
        status: true,
        created_at: true,
        user: {
          select: { id_user: true, name: true, email: true }
        },
        // Categoría del comercio y productos visibles
        store_category: {
          select: { id_store_category: true, name: true }
        },
        products: {
          where: { status: true, visible: true },
          select: {
            id_product: true,
            name: true,
            price: true,
            quantity: true,
            visible: true,
            product_category: {
              select: { id_product_category: true, name: true }
            }
          }
        },
        addresses: {
          where: { status: true },
          select: { id_address: true }
        }
      }
    });

    // Si no se encuentra el comercio, lanzar error 404
    if (!store) {
      throw { status: 404, message: "Comercio no encontrado" };
    }
    // Retornar el comercio encontrado
    return store;
  } catch (error) {
    if (error.status) {
      throw error; // re-lanza el error original (404, 400, etc.)
    }
    throw {
      status: 500,
      message: "Error al obtener la tienda",
      details: error.message
    };
  }
};

/**
 * Obtiene todos los productos de una tienda específica, filtrando por productos activos y visibles. Realiza validaciones básicas y maneja errores.
 * @param {*} id_store 
 * @returns 
 */
export const getAllProductsByStoreService = async (id_store) => {
  try {
    // validaciones básicas
    if (!id_store) {
      throw { status: 400, message: "ID de tienda es requerido" };
    }
    if (isNaN(Number(id_store))) {
      throw { status: 400, message: "ID de tienda debe ser un número" };
    }
    // Verificar que la tienda exista
    const store = await prisma.stores.findUnique({
      where: { id_store: Number(id_store) },
      select: { id_store: true }
    });
    // Si no se encuentra la tienda, lanzar error 404
    if (!store) {
      throw { status: 404, message: "Comercio no encontrado" };
    }
    // Obtener productos activos y visibles de la tienda
    const products = await prisma.products.findMany({
      where: {
        fk_store: Number(id_store),
        status: true
      },
      select: {
        id_product: true,
        name: true,
        description: true,
        price: true,
        quantity: true,
        visible: true,
        created_at: true,
        product_category: {
          select: { id_product_category: true, name: true }
        }
      },
      orderBy: { created_at: "desc" }
    });
    // Si no se encuentran productos, lanzar error 404
    if (!products || products.length === 0) {
      throw { status: 404, message: "No se encontraron productos para esta tienda" };
    }
    // Retornar los productos encontrados
    return products;
  } catch (error) {
    if (error.status) {
      throw error; // re-lanza el error original (404, 400, etc.)
    }

    throw {
      status: 500,
      message: "Error al obtener la tienda",
      details: error.message
    };
  }
};

/**
 * Obtiene productos de una tienda específica aplicando filtros dinámicos como nombre, categoría, visibilidad y rango de precios. Realiza validaciones básicas y maneja errores.
 * @param {*} id_store 
 * @param {*} filters 
 * @returns 
 */
export const filterStorePriductsService = async (id_store, filters) => {
  try {
    // validaciones básicas
    if (!id_store) {
      throw { status: 400, message: "ID de tienda es requerido" };
    }
    if (isNaN(Number(id_store))) {
      throw { status: 400, message: "ID de tienda debe ser un número" };
    }
    // Verificar que la tienda exista
    const store = await prisma.stores.findUnique({
      where: { id_store: Number(id_store) },
      select: { id_store: true }
    });
    // Si no se encuentra la tienda, lanzar error 404
    if (!store) {
      throw { status: 404, message: "Comercio no encontrado" };
    }
    // Construir condiciones de filtrado dinámicamente
    const { name, category, visible, minPrice, maxPrice, sortBy, sortOrder } = filters;
    // Condiciones base para productos activos de la tienda
    const whereConditions = {
      fk_store: Number(id_store),
      status: true
    };
    if (name) {
      whereConditions.name = { contains: name, mode: "insensitive" };
    }
    if (category) {
      whereConditions.fk_product_category = Number(category);
    }
    if (visible !== undefined && visible !== null) {
      whereConditions.visible = visible;
    }
    if (minPrice !== undefined && minPrice !== null) {
      whereConditions.price = { gte: Number(minPrice) };
    }
    if (maxPrice !== undefined && maxPrice !== null) {
      whereConditions.price = { ...whereConditions.price, lte: Number(maxPrice) };
    }
    // Obtener productos filtrados de la tienda
    const products = await prisma.products.findMany({
      where: whereConditions,
      select: {
        id_product: true,
        name: true,
        description: true,
        price: true,
        quantity: true,
        visible: true,
        created_at: true,
        product_category: {
          select: { id_product_category: true, name: true }
        }
      },
      // Ordenar por el campo especificado o por fecha de creación por defecto
      orderBy: { [sortBy || "created_at"]: sortOrder === "asc" ? "asc" : "desc" }
    });

    // Si no se encuentran productos, lanzar error 404
    if (!products || products.length === 0) {
      throw { status: 404, message: "No se encontraron productos para esta tienda con los filtros aplicados" };
    }
    // Retornar los productos encontrados
    return products;
  } catch (error) {
    if (error.status) {
      throw error; // re-lanza el error original (404, 400, etc.)
    }

    throw {
      status: 500,
      message: "Error al obtener la tienda",
      details: error.message
    };
  }
};

