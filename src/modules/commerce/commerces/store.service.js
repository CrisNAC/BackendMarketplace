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
    if (usuario.role !== "SELLER") {
      throw { status: 403, message: "El usuario no es vendedor" };
    }

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

    if (!categoria) {
      throw { status: 400, message: "Categoría no válida" };
    }

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