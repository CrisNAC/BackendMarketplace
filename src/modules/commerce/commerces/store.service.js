// src/modules/commerce/commerces/store.service.js
import { prisma } from "../../../lib/prisma.js";

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
    tiktok_url
  } = data;

  // validaciones básicas
  if (!fk_user || !fk_store_category || !name || !email || !phone) {
    throw { status: 400, message: "Faltan campos obligatorios" };
  }

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
  const nuevaTienda = await prisma.stores.create({
    data: {
      fk_user,
      fk_store_category,
      name,
      email,
      phone,
      description,
      logo,
      website_url,
      instagram_url,
      tiktok_url
    }
  });

  return nuevaTienda;
};