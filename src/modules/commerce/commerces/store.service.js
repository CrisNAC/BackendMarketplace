// src/modules/commerce/commerces/store.service.js
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "../../../lib/prisma.js";
import { getProductPricing } from "../../../lib/product-pricing.js";
import { validateStoreCategoryService } from "../store-categories/store-category.service.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_LOCAL_LOGO_DIRECTORIES = new Set(["uploads", "storage", "public"]);
const STORE_RESPONSE_SELECT = {
  id_store: true,
  fk_user: true,
  fk_store_category: true,
  name: true,
  email: true,
  phone: true,
  description: true,
  logo: true,
  website_url: true,
  instagram_url: true,
  tiktok_url: true,
  status: true,
  created_at: true,
  updated_at: true,
  user: {
    select: {
      id_user: true,
      name: true,
      email: true,
      role: true,
      status: true
    }
  },
  store_category: {
    select: {
      id_store_category: true,
      name: true,
      status: true
    }
  },
  products: {
    where: { status: true, visible: true },
    select: {
      id_product: true,
      name: true,
      price: true,
      offer_price: true,
      quantity: true,
      visible: true,
      is_offer: true,
      product_category: {
        select: {
          id_product_category: true,
          name: true
        }
      }
    }
  },
  addresses: {
    where: { status: true },
    orderBy: { created_at: "asc" },
    select: {
      id_address: true,
      address: true,
      city: true,
      region: true,
      postal_code: true,
      latitude: true,
      longitude: true,
      status: true,
      created_at: true,
      updated_at: true
    }
  }
};

const parsePositiveInteger = (value, fieldName) => {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw {
      status: 400,
      message: `${fieldName} invalido`
    };
  }

  return parsedValue;
};

const normalizeOptionalStringValue = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  const normalizedValue = value.toString().trim();
  return normalizedValue ? normalizedValue : null;
};

const validateRequiredStringField = (value, fieldName, maxLength) => {
  const normalizedValue = value?.toString().trim();

  if (!normalizedValue) {
    throw {
      status: 400,
      message: `${fieldName} no puede estar vacio`
    };
  }

  if (maxLength && normalizedValue.length > maxLength) {
    throw {
      status: 400,
      message: `${fieldName} no puede superar ${maxLength} caracteres`
    };
  }

  return normalizedValue;
};

const validateOptionalStringField = (value, fieldName, maxLength) => {
  const normalizedValue = normalizeOptionalStringValue(value);

  if (normalizedValue === undefined) {
    return undefined;
  }

  if (normalizedValue === null) {
    return null;
  }

  if (maxLength && normalizedValue.length > maxLength) {
    throw {
      status: 400,
      message: `${fieldName} no puede superar ${maxLength} caracteres`
    };
  }

  return normalizedValue;
};

const validateEmailField = (value) => {
  const normalizedEmail = validateRequiredStringField(value, "email", 100);

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    throw {
      status: 400,
      message: "Formato de email invalido"
    };
  }

  return normalizedEmail;
};

const validateCoordinateField = (value, fieldName, min, max) => {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue < min || parsedValue > max) {
    throw {
      status: 400,
      message: `${fieldName} invalida`
    };
  }

  return parsedValue;
};

const getReverseGeocodedAddress = async (latitude, longitude) => {
  const params = new URLSearchParams({
    format: "json",
    lat: latitude.toString(),
    lon: longitude.toString()
  });

  let response;
  try {
    response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
      {
        headers: {
          "User-Agent": "BackendMarketplace/1.0",
          Accept: "application/json",
          "Accept-Language": "es"
        },
        signal: AbortSignal.timeout(10000)
      }
    );
  } catch (error) {
    throw {
      status: 502,
      message: "No se pudo conectar con el servicio de Nominatim"
    };
  }

  if (!response.ok) {
    throw {
      status: 502,
      message: "No se pudo obtener la ubicacion desde Nominatim"
    };
  }

  const data = await response.json();
  const parsedAddress = data?.address || {};

  return {
    city: validateRequiredStringField(
      parsedAddress.city ||
        parsedAddress.town ||
        parsedAddress.village ||
        parsedAddress.hamlet ||
        parsedAddress.county ||
        parsedAddress.state ||
        "Sin ciudad",
      "city",
      100
    ),
    region: validateRequiredStringField(
      parsedAddress.suburb ||
        parsedAddress.neighbourhood ||
        parsedAddress.city_district ||
        parsedAddress.state_district ||
        parsedAddress.road ||
        parsedAddress.residential ||
        parsedAddress.county ||
        "Sin region",
      "region",
      100
    ),
    postal_code: validateOptionalStringField(
      parsedAddress.postcode ?? null,
      "postal_code",
      20
    ) ?? null
  };
};

const parseBooleanField = (value, fieldName) => {
  if (typeof value === "boolean") {
    return value;
  }

  const normalizedValue = String(value).trim().toLowerCase();

  if (normalizedValue === "true" || normalizedValue === "1") {
    return true;
  }

  if (normalizedValue === "false" || normalizedValue === "0") {
    return false;
  }

  throw {
    status: 400,
    message: `${fieldName} debe ser booleano`
  };
};

const mapStoreProductPricing = (product) => {
  const pricing = getProductPricing(product);

  return {
    ...product,
    price: pricing.price,
    original_price: pricing.originalPrice,
    offer_price: pricing.offerPrice,
    is_offer: pricing.isOffer
  };
};

const mapStoreWithPricedProducts = (store) => {
  if (!store) {
    return store;
  }

  return {
    ...store,
    products: Array.isArray(store.products)
      ? store.products.map(mapStoreProductPricing)
      : []
  };
};

// valida que el usuario autenticado sea el propietario del comercio solicitado
export const getAuthorizedStoreOwnerService = async (
  authenticatedUserId,
  requestedStoreId
) => {
  if (!authenticatedUserId) {
    throw {
      status: 401,
      message: "Usuario autenticado requerido"
    };
  }

  const authenticatedId = parsePositiveInteger(
    authenticatedUserId,
    "ID de usuario autenticado"
  );
  const storeId = parsePositiveInteger(requestedStoreId, "ID de comercio");

  const store = await prisma.stores.findUnique({
    where: { id_store: storeId },
    select: {
      id_store: true,
      fk_user: true,
      logo: true,
      status: true,
      user: {
        select: {
          id_user: true,
          status: true
        }
      }
    }
  });

  if (!store || !store.status) {
    throw {
      status: 404,
      message: "Comercio no encontrado o inactivo"
    };
  }

  if (!store.user || !store.user.status) {
    throw {
      status: 404,
      message: "Propietario del comercio no encontrado o inactivo"
    };
  }

  if (store.fk_user !== authenticatedId) {
    throw {
      status: 403,
      message: "No tiene permisos para editar este comercio"
    };
  }

  return store;
};

const resolveLocalLogoPath = (logoValue) => {
  const normalizedLogoValue = normalizeOptionalStringValue(logoValue);

  if (!normalizedLogoValue || /^https?:\/\//i.test(normalizedLogoValue)) {
    return null;
  }

  const relativeLogoPath = normalizedLogoValue
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");

  if (!relativeLogoPath) {
    return null;
  }

  const firstDirectory = relativeLogoPath.split("/")[0];
  if (!ALLOWED_LOCAL_LOGO_DIRECTORIES.has(firstDirectory)) {
    return null;
  }

  return path.resolve(process.cwd(), relativeLogoPath);
};

const deletePreviousStoreLogoFromStorage = async (previousLogo, nextLogo) => {
  const normalizedPreviousLogo = normalizeOptionalStringValue(previousLogo);
  const normalizedNextLogo = normalizeOptionalStringValue(nextLogo);

  if (
    !normalizedPreviousLogo ||
    normalizedPreviousLogo === normalizedNextLogo
  ) {
    return;
  }

  const previousLogoPath = resolveLocalLogoPath(normalizedPreviousLogo);
  if (!previousLogoPath) {
    return;
  }

  try {
    await fs.unlink(previousLogoPath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn("No se pudo eliminar el logo anterior:", error.message);
    }
  }
};

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
    latitude,
    longitude,
  } = data;

  if (
    !fk_user ||
    !fk_store_category ||
    !name ||
    !email ||
    !phone ||
    !address ||
    latitude === undefined ||
    longitude === undefined
  ) {
    throw { status: 400, message: "Faltan campos obligatorios" };
  }

  if (!Number.isInteger(fk_user) || fk_user <= 0) {
    throw { status: 400, message: "fk_user invalido" };
  }

  if (!Number.isInteger(fk_store_category) || fk_store_category <= 0) {
    throw { status: 400, message: "fk_store_category invalido" };
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

  if (!EMAIL_REGEX.test(email)) {
    throw { status: 400, message: "Formato de email invalido" };
  }

  if (!phone || typeof phone !== "string" || !phone.trim()) {
    throw { status: 400, message: "El telefono es obligatorio" };
  }

  if (phone.length > 20) {
    throw { status: 400, message: "El telefono es demasiado largo" };
  }

  if (!address || typeof address !== "string" || !address.trim()) {
    throw { status: 400, message: "La direccion es obligatoria" };
  }

  const normalizedLatitude = validateCoordinateField(latitude, "latitud", -90, 90);
  const normalizedLongitude = validateCoordinateField(longitude, "longitud", -180, 180);
  const reverseAddress = await getReverseGeocodedAddress(normalizedLatitude, normalizedLongitude);

  try {
    const usuario = await prisma.users.findUnique({
      where: { id_user: fk_user },
    });

    if (!usuario) {
      throw { status: 404, message: "Usuario no encontrado" };
    }

    //Verificar que sea SELLER
    // if (usuario.role !== "SELLER") {
    //   throw { status: 403, message: "El usuario no es vendedor" };
    // }

    const tiendaExistente = await prisma.stores.findUnique({
      where: { fk_user },
    });

    if (tiendaExistente) {
      throw { status: 409, message: "El usuario ya tiene un comercio" };
    }

    const categoria = await prisma.storeCategories.findUnique({
      where: { id_store_category: fk_store_category },
    });

    if (!categoria) {
      throw { status: 400, message: "Categoria no valida" };
    }

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
          tiktok_url,
        },
      });

      await tx.addresses.create({
        data: {
          fk_user,
          fk_store: store.id_store,
          address: address.trim(),
          city: reverseAddress.city,
          region: reverseAddress.region,
          postal_code: reverseAddress.postal_code,
          latitude: normalizedLatitude,
          longitude: normalizedLongitude,
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

export const updateStoreService = async (
  authenticatedUserId,
  requestedStoreId,
  payload
) => {
  const store = await getAuthorizedStoreOwnerService(
    authenticatedUserId,
    requestedStoreId
  );

  const dataToUpdate = {};
  const addressDataToUpdate = {};
  let hasCoordinatesToUpdate = false;

  if (payload?.fk_store_category !== undefined) {
    dataToUpdate.fk_store_category = await validateStoreCategoryService(
      payload.fk_store_category
    );
  }

  if (payload?.name !== undefined) {
    dataToUpdate.name = validateRequiredStringField(payload.name, "name", 100);
  }

  if (payload?.email !== undefined) {
    dataToUpdate.email = validateEmailField(payload.email);
  }

  if (payload?.phone !== undefined) {
    dataToUpdate.phone = validateRequiredStringField(payload.phone, "phone", 20);
  }

  if (payload?.description !== undefined) {
    dataToUpdate.description = normalizeOptionalStringValue(payload.description);
  }

  if (payload?.logo !== undefined) {
    dataToUpdate.logo = validateOptionalStringField(payload.logo, "logo", 500);
  }

  if (payload?.website_url !== undefined) {
    dataToUpdate.website_url = validateOptionalStringField(
      payload.website_url,
      "website_url",
      500
    );
  }

  if (payload?.instagram_url !== undefined) {
    dataToUpdate.instagram_url = validateOptionalStringField(
      payload.instagram_url,
      "instagram_url",
      500
    );
  }

  if (payload?.tiktok_url !== undefined) {
    dataToUpdate.tiktok_url = validateOptionalStringField(
      payload.tiktok_url,
      "tiktok_url",
      500
    );
  }

  if (payload?.address !== undefined) {
    addressDataToUpdate.address = validateRequiredStringField(
      payload.address,
      "address"
    );
  }

  const hasLatitude = payload?.latitude !== undefined;
  const hasLongitude = payload?.longitude !== undefined;

  if (hasLatitude !== hasLongitude) {
    throw {
      status: 400,
      message: "Debe enviar latitud y longitud juntas"
    };
  }

  if (hasLatitude && hasLongitude) {
    const normalizedLatitude = validateCoordinateField(
      payload.latitude,
      "latitud",
      -90,
      90
    );
    const normalizedLongitude = validateCoordinateField(
      payload.longitude,
      "longitud",
      -180,
      180
    );
    const reverseAddress = await getReverseGeocodedAddress(
      normalizedLatitude,
      normalizedLongitude
    );

    addressDataToUpdate.latitude = normalizedLatitude;
    addressDataToUpdate.longitude = normalizedLongitude;
    addressDataToUpdate.city = reverseAddress.city;
    addressDataToUpdate.region = reverseAddress.region;
    addressDataToUpdate.postal_code = reverseAddress.postal_code;
    hasCoordinatesToUpdate = true;
  }

  if (
    Object.keys(dataToUpdate).length === 0 &&
    Object.keys(addressDataToUpdate).length === 0
  ) {
    throw {
      status: 400,
      message: "Debe enviar al menos un campo para actualizar el comercio"
    };
  }

  let addressId = null;

  if (Object.keys(addressDataToUpdate).length > 0) {
    const existingAddress = await prisma.addresses.findFirst({
      where: {
        fk_store: store.id_store,
        status: true
      },
      orderBy: {
        created_at: "asc"
      },
      select: {
        id_address: true
      }
    });

    addressId = existingAddress?.id_address ?? null;
  }

  try {
    const updatedStore = await prisma.$transaction(async (tx) => {
      if (Object.keys(dataToUpdate).length > 0) {
        await tx.stores.update({
          where: { id_store: store.id_store },
          data: dataToUpdate
        });
      }

      if (addressId) {
        await tx.addresses.update({
          where: { id_address: addressId },
          data: addressDataToUpdate
        });
      } else if (Object.keys(addressDataToUpdate).length > 0) {
        if (!hasCoordinatesToUpdate) {
          throw {
            status: 400,
            message:
              "Para crear la dirección inicial del comercio debes enviar latitude y longitude"
          };
        }

        await tx.addresses.create({
          data: {
            fk_user: store.fk_user,
            fk_store: store.id_store,
            address: addressDataToUpdate.address ?? "",
            city: addressDataToUpdate.city ?? "",
            region: addressDataToUpdate.region ?? "",
            postal_code: addressDataToUpdate.postal_code ?? null,
            latitude: addressDataToUpdate.latitude,
            longitude: addressDataToUpdate.longitude,
          }
        });
      }

      return tx.stores.findUnique({
        where: { id_store: store.id_store },
        select: STORE_RESPONSE_SELECT
      });
    });

    if (!updatedStore) {
      throw {
        status: 500,
        message: "No se pudo recuperar el comercio actualizado"
      };
    }

    await deletePreviousStoreLogoFromStorage(store.logo, updatedStore.logo);

    return mapStoreWithPricedProducts(updatedStore);
  } catch (error) {
    if (error.code === "P2002") {
      throw {
        status: 409,
        message: "Email ya registrado"
      };
    }

    throw error;
  }
};

export const getStoreByIdService = async (id) => {
  try {
    // validaciones básicas
    if (!id) {
      throw { status: 400, message: "ID de tienda es requerido" };
    }
    if (isNaN(Number(id))) {
      throw { status: 400, message: "ID de tienda debe ser un número" };
    }

    const store = await prisma.stores.findUnique({
      where: { id_store: Number(id) },
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
            offer_price: true,
            quantity: true,
            visible: true,
            is_offer: true,
            product_category: {
              select: { id_product_category: true, name: true }
            }
          }
        },
        addresses: {
          where: { status: true },
          orderBy: { created_at: "asc" },
          select: {
            id_address: true,
            address: true,
            city: true,
            region: true,
            postal_code: true,
            latitude: true,
            longitude: true,
            status: true,
            created_at: true,
            updated_at: true
          }
        }
      }
    });

    // Si no se encuentra el comercio, lanzar error 404
    if (!store) {
      throw { status: 404, message: "Comercio no encontrado" };
    }

    return mapStoreWithPricedProducts(store);

  } catch (error) {
    if (error.status) {
      throw error;
    }

    throw {
      status: 500,
      message: "Error al obtener la tienda",
      details: error.message,
    };
  }
};

export const getAllProductsByStoreService = async (id) => {
  try {
    // validaciones básicas
    if (!id) {
      throw { status: 400, message: "ID de tienda es requerido" };
    }
    if (isNaN(Number(id))) {
      throw { status: 400, message: "ID de tienda debe ser un número" };
    }

    const store = await prisma.stores.findUnique({
      where: { id_store: Number(id) },
      select: { id_store: true },
    });

    if (!store) {
      throw { 
        status: 404, 
        message: "Comercio no encontrado" 
      };
    }

    const products = await prisma.products.findMany({
      where: {
        fk_store: Number(id),
        status: true,
      },
      select: {
        id_product: true,
        name: true,
        description: true,
        price: true,
        offer_price: true,
        quantity: true,
        visible: true,
        is_offer: true,
        created_at: true,
        product_category: {
          select: { id_product_category: true, name: true },
        },
      },
      orderBy: { created_at: "desc" },
    });

    if (!products || products.length === 0) {
      throw {
        status: 404,
        message: "No se encontraron productos para esta tienda"
      };
    }

    return products.map(mapStoreProductPricing);

  } catch (error) {
    if (error.status) {
      throw error;
    }

    throw {
      status: 500,
      message: "Error al obtener la tienda",
      details: error.message,
    };
  }
};

export const filterStoreProductsService = async (id, filters, pagination) => {
  try {
    // validaciones básicas
    if (!id) {
      throw { status: 400, message: "ID de tienda es requerido" };
    }
    if (isNaN(Number(id))) {
      throw { status: 400, message: "ID de tienda debe ser un número" };
    }

    const store = await prisma.stores.findUnique({
      where: { id_store: Number(id) },
      select: { id_store: true },
    });

    if (!store) {
      throw { status: 404, message: "Comercio no encontrado" };
    }

    const {
      name,
      category,
      visible,
      available,
      minPrice,
      maxPrice,
      price_min,
      price_max,
      isOffer,
      is_offer,
      sortBy,
      sortOrder
    } = filters;

    const whereConditions = {
      fk_store: Number(id),
      status: true,
    };

    if (name) {
      whereConditions.name = { contains: name, mode: "insensitive" };
    }

    if (category) {
      whereConditions.fk_product_category = Number(category);
    }

    const resolvedVisible = visible ?? available;
    if (resolvedVisible !== undefined && resolvedVisible !== null) {
      whereConditions.visible = resolvedVisible;
    }

    const resolvedIsOffer = isOffer ?? is_offer;
    let normalizedIsOfferFilter;
    if (resolvedIsOffer !== undefined && resolvedIsOffer !== null) {
      normalizedIsOfferFilter =
        typeof resolvedIsOffer === "boolean"
          ? resolvedIsOffer
          : parseBooleanField(resolvedIsOffer, "isOffer");
      whereConditions.is_offer = normalizedIsOfferFilter;
    }

    const resolvedMinPrice = minPrice ?? price_min;
    const resolvedMaxPrice = maxPrice ?? price_max;

    const effectivePriceRange = {};
    if (resolvedMinPrice !== undefined && resolvedMinPrice !== null) {
      effectivePriceRange.gte = Number(resolvedMinPrice);
    }

    if (resolvedMaxPrice !== undefined && resolvedMaxPrice !== null) {
      effectivePriceRange.lte = Number(resolvedMaxPrice);
    }

    if (Object.keys(effectivePriceRange).length > 0) {
      const effectivePriceBranches = [];

      if (normalizedIsOfferFilter !== true) {
        effectivePriceBranches.push({
          AND: [
            { is_offer: false },
            { price: effectivePriceRange }
          ]
        });
      }

      if (normalizedIsOfferFilter !== false) {
        effectivePriceBranches.push({
          AND: [
            { is_offer: true },
            { offer_price: effectivePriceRange }
          ]
        });
      }

      whereConditions.OR = [
        ...(Array.isArray(whereConditions.OR) ? whereConditions.OR : []),
        ...effectivePriceBranches
      ];
    }

    const [totalProducts, products] = await Promise.all([
      prisma.products.count({
        where: whereConditions
      }),
      prisma.products.findMany({
      where: whereConditions,
      skip: pagination?.skip ?? 0,
      take: pagination?.limit ?? 20,
      select: {
        id_product: true,
        name: true,
        description: true,
        price: true,
        offer_price: true,
        quantity: true,
        visible: true,
        is_offer: true,
        created_at: true,
        product_category: {
          select: { id_product_category: true, name: true },
        },
      },
      orderBy: { [sortBy || "created_at"]: sortOrder === "asc" ? "asc" : "desc" }
      })
    ]);

    if (totalProducts === 0) {
      throw {
        status: 404,
        message: "No se encontraron productos para esta tienda con los filtros aplicados"
      };
    }

    return {
      products: products.map(mapStoreProductPricing),
      totalProducts
    };

  } catch (error) {
    if (error.status) {
      throw error;
    }

    throw {
      status: 500,
      message: "Error al obtener la tienda",
      details: error.message,
    };
  }
};


/**
 * Esta funcion se utiliza para el borrado logico de un comercio y sus respectivos productos en base al usuario autenticado que debe ser el dueño.
 * 
 * @param {*} id_user 
 * @param {*} id_store 
 * @returns 
 */
export const deleteStoreService = async (id_user, id_store) => {
  const store = await prisma.stores.findUnique(
    { where: { id_store }, 
    include: { user: { select: { id_user: true, role: true}}} }); //busca el comercio y trae campos del usuario
  
  if (!store || !store.status) throw { status: 404, message: "Comercio no encontrado"}; // verifica que exista el comercio
  if (store.fk_user !== id_user) throw { status: 403, message: "No tienes permiso para eliminar este comercio" }; // verifica que sea el dueño del comercio

  const isSeller = store.user?.role === "SELLER"; //comprobacion si es SELLER

  await prisma.$transaction([ // transaccion en donde ocurren los cambios de estados para el comercio y sus respectivos productos
    prisma.stores.update({ where: { id_store }, data: { status: false }}),
    prisma.products.updateMany({ where: { fk_store: id_store }, data: { status: false } }),
    ...(isSeller ? [prisma.users.update({ where: { id_user }, data: { role: "CUSTOMER"} })] : [])
     //actualizar role del usuario a CUSTOMER
  ])
  return { success: true };
}

export const getStoresService = async (filters = {}) => {
  const search = filters.search?.toString().trim();
  const categoryIdRaw =
    filters.storeCategoryId ?? filters.categoryId ?? filters.fk_store_category;

  const where = { status: true };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } }
    ];
  }

  if (
    categoryIdRaw !== undefined &&
    categoryIdRaw !== null &&
    String(categoryIdRaw).trim() !== ""
  ) {
    const categoryId = Number(categoryIdRaw);
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      throw { status: 400, message: "storeCategoryId invalido" };
    }
    where.fk_store_category = categoryId;
  }

  const stores = await prisma.stores.findMany({
    where,
    orderBy: { id_store: "desc" },
    select: {
      id_store: true,
      name: true,
      description: true,
      logo: true,
      status: true,
      store_category: {
        select: { id_store_category: true, name: true }
      }
    }
  });

  return stores;
};
