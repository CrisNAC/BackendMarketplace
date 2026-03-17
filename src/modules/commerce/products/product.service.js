import { prisma } from "../../../lib/prisma.js";
import { validateProductCategoryService } from "../../global/categories/product-categories/product-category.service.js";
import {
  parseProductTagIdsService,
  validateProductTagsService
} from "../product-tags/product-tag.service.js";
import { ForbiddenError } from "../../../lib/errors.js";

const DEFAULT_PRODUCT_INITIAL_STATUS = "pending";
const ALLOWED_PRODUCT_INITIAL_STATUS = new Set(["pending", "active"]);
const DEFAULT_PRODUCTS_PAGE = 1;
const DEFAULT_PRODUCTS_LIMIT = 20;
const MAX_PRODUCTS_LIMIT = 100;

const PRODUCT_RESPONSE_SELECT = {
  id_product: true,
  name: true,
  description: true,
  price: true,
  quantity: true,
  fk_product_category: true,
  fk_store: true,
  visible: true,
  created_at: true,
  updated_at: true,
  product_category: {
    select: {
      id_product_category: true,
      name: true,
      status: true
    }
  },
  store: {
    select: {
      id_store: true,
      name: true
      //logo: true
    }
  },
  product_tag_relations: {
    where: { status: true },
    select: {
      product_tag: {
        select: {
          id_product_tag: true,
          name: true
        }
      }
    }
  },
  product_reviews: {
    where: { status: true, approved: true },
    select: { rating: true }
  }
};

const resolveInitialProductStatus = () => {
  const configuredStatus = String(
    process.env.PRODUCT_INITIAL_STATUS || DEFAULT_PRODUCT_INITIAL_STATUS
  ).toLowerCase();

  return ALLOWED_PRODUCT_INITIAL_STATUS.has(configuredStatus)
    ? configuredStatus
    : DEFAULT_PRODUCT_INITIAL_STATUS;
};

const parsePositiveInteger = (value, fieldName) => {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw { status: 400, message: `${fieldName} invalido` };
  }

  return parsedValue;
};

const sanitizePaginationValue = (value, fallback) => {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return Math.floor(parsedValue);
};

const validateRequiredStringField = (value, fieldName, maxLength = null) => {
  const normalizedValue = value?.toString().trim();

  if (!normalizedValue) {
    throw { status: 400, message: `${fieldName} es requerido` };
  }

  if (maxLength && normalizedValue.length > maxLength) {
    throw {
      status: 400,
      message: `${fieldName} no puede superar ${maxLength} caracteres`
    };
  }

  return normalizedValue;
};

const normalizeOptionalStringField = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  const normalizedValue = value.toString().trim();
  return normalizedValue ? normalizedValue : null;
};

const validatePriceField = (value) => {
  if (value === undefined || value === null || value === "") {
    throw { status: 400, message: "price es requerido" };
  }

  const parsedPrice = Number(value);
  if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
    throw { status: 400, message: "price debe ser mayor a 0" };
  }

  return parsedPrice;
};

const parseQuantityField = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  const parsedQuantity = Number(value);
  if (!Number.isInteger(parsedQuantity) || parsedQuantity < 0) {
    throw { status: 400, message: "quantity debe ser un entero mayor o igual a 0" };
  }

  return parsedQuantity;
};

const parseCategoryField = async (value) => {
  const categoryId = Number(value);
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    throw { status: 400, message: "categoryId es requerido y debe ser numerico" };
  }

  await validateProductCategoryService(categoryId);
  return categoryId;
};

const parseVisibilityOverride = (payload) => {
  if (payload?.visible !== undefined && payload?.visible !== null && payload?.visible !== "") {
    if (typeof payload.visible === "boolean") {
      return payload.visible;
    }

    const normalizedVisible = String(payload.visible).toLowerCase();
    if (normalizedVisible === "true" || normalizedVisible === "1") {
      return true;
    }
    if (normalizedVisible === "false" || normalizedVisible === "0") {
      return false;
    }

    throw { status: 400, message: "visible debe ser booleano" };
  }

  if (payload?.status !== undefined && payload?.status !== null && payload?.status !== "") {
    const normalizedStatus = String(payload.status).toLowerCase();

    if (normalizedStatus === "active") {
      return true;
    }
    if (normalizedStatus === "pending") {
      return false;
    }

    throw { status: 400, message: "status debe ser 'active' o 'pending'" };
  }

  return null;
};

const mapProductResponse = (product) => {
  const ratings = product.product_reviews?.map(r => r.rating).filter(r => r !== null) || [];
  const lifecycleStatus = product.visible ? "active" : "pending";

  return {
    id: product.id_product,
    name: product.name,
    description: product.description,
    price: Number(product.price),
    quantity: product.quantity,
    categoryId: product.fk_product_category,
    category: product.product_category
      ? {
          id: product.product_category.id_product_category,
          name: product.product_category.name,
          status: product.product_category.status
        }
      : null,
    tags:
      product.product_tag_relations?.map((relation) => ({
        id: relation.product_tag.id_product_tag,
        name: relation.product_tag.name
      })) || [],
    commerce: product.store ? {
      id: product.store.id_store,
      name: product.store.name
      //logo: product.store.logo
    } : null,
    averageRating: ratings.length
      ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2))
      : null,
    reviewCount: ratings.length,
    visible: product.visible,
    status: lifecycleStatus,
    createdAt: product.created_at,
    updatedAt: product.updated_at
  };
};

const getAuthenticatedSellerStore = async (authenticatedUserId) => {
  if (!authenticatedUserId) {
    throw { status: 401, message: "Usuario autenticado requerido" };
  }

  const sellerId = Number(authenticatedUserId);
  if (!Number.isInteger(sellerId) || sellerId <= 0) {
    throw { status: 400, message: "ID de usuario autenticado invalido" };
  }

  const seller = await prisma.users.findUnique({
    where: { id_user: sellerId },
    select: {
      id_user: true,
      role: true,
      status: true,
      store: {
        select: {
          id_store: true,
          status: true
        }
      }
    }
  });

  if (!seller || !seller.status) {
    throw { status: 404, message: "Usuario no encontrado o inactivo" };
  }

  if (seller.role !== "SELLER") {
    throw { status: 403, message: "El usuario autenticado no es vendedor" };
  }

  if (!seller.store || !seller.store.status) {
    throw { status: 404, message: "El vendedor no tiene un comercio activo" };
  }

  return seller.store.id_store;
};

const getExistingProductForUpdateService = async (productId) => {
  const resolvedProductId = parsePositiveInteger(productId, "ID de producto");

  const product = await prisma.products.findUnique({
    where: { id_product: resolvedProductId },
    select: {
      id_product: true,
      fk_store: true,
      status: true
    }
  });

  if (!product || !product.status) {
    throw { status: 404, message: "Producto no encontrado" };
  }

  return product;
};

const getProductResponseByIdService = async (
  productId,
  tx = prisma,
  options = {}
) => {
  const { requireVisible = false } = options;

  return tx.products.findFirst({
    where: {
      id_product: productId,
      status: true,
      ...(requireVisible ? { visible: true } : {})
    },
    select: PRODUCT_RESPONSE_SELECT
  });
};

const buildCreateProductData = async (payload) => {
  const name = validateRequiredStringField(payload?.name, "name", 100);
  const price = validatePriceField(payload?.price);
  const categoryId = await parseCategoryField(payload?.categoryId);
  const quantity = parseQuantityField(payload?.quantity);
  const description = normalizeOptionalStringField(payload?.description) ?? null;
  const visibilityOverride = parseVisibilityOverride({ visible: payload?.visible });
  const tagIds = parseProductTagIdsService(payload?.tags);

  await validateProductTagsService(tagIds);

  return {
    data: {
      name,
      description,
      price,
      quantity: quantity ?? null,
      fk_product_category: categoryId
    },
    tagIds,
    visibilityOverride
  };
};

const buildUpdateProductData = async (payload) => {
  const dataToUpdate = {};

  if (payload?.name !== undefined) {
    dataToUpdate.name = validateRequiredStringField(payload.name, "name", 100);
  }

  if (payload?.description !== undefined) {
    dataToUpdate.description = normalizeOptionalStringField(payload.description);
  }

  if (payload?.price !== undefined) {
    dataToUpdate.price = validatePriceField(payload.price);
  }

  if (payload?.categoryId !== undefined) {
    dataToUpdate.fk_product_category = await parseCategoryField(payload.categoryId);
  }

  if (payload?.quantity !== undefined) {
    dataToUpdate.quantity = parseQuantityField(payload.quantity);
  }

  const visibilityOverride = parseVisibilityOverride(payload);
  if (visibilityOverride !== null) {
    dataToUpdate.visible = visibilityOverride;
  }

  let nextTagIds;
  if (payload?.tags !== undefined) {
    nextTagIds = parseProductTagIdsService(payload.tags);
    await validateProductTagsService(nextTagIds);
  }

  if (Object.keys(dataToUpdate).length === 0 && nextTagIds === undefined) {
    throw {
      status: 400,
      message: "Debe enviar al menos un campo para actualizar el producto"
    };
  }

  return {
    dataToUpdate,
    nextTagIds
  };
};

const syncProductTagsService = async (tx, productId, nextTagIds) => {
  const existingRelations = await tx.productTagRelations.findMany({
    where: {
      fk_product: productId
    },
    select: {
      id_product_tag_relation: true,
      fk_product_tag: true,
      status: true
    }
  });

  const activeRelationIdsToDisable = existingRelations
    .filter(
      (relation) => relation.status && !nextTagIds.includes(relation.fk_product_tag)
    )
    .map((relation) => relation.id_product_tag_relation);

  if (activeRelationIdsToDisable.length) {
    await tx.productTagRelations.updateMany({
      where: {
        id_product_tag_relation: {
          in: activeRelationIdsToDisable
        }
      },
      data: {
        status: false
      }
    });
  }

  const activeTagIds = new Set(
    existingRelations
      .filter((relation) => relation.status)
      .map((relation) => relation.fk_product_tag)
  );

  const inactiveRelationByTagId = new Map();
  for (const relation of existingRelations) {
    if (!relation.status && !inactiveRelationByTagId.has(relation.fk_product_tag)) {
      inactiveRelationByTagId.set(
        relation.fk_product_tag,
        relation.id_product_tag_relation
      );
    }
  }

  const relationIdsToReactivate = nextTagIds
    .filter(
      (tagId) => !activeTagIds.has(tagId) && inactiveRelationByTagId.has(tagId)
    )
    .map((tagId) => inactiveRelationByTagId.get(tagId));

  if (relationIdsToReactivate.length) {
    await tx.productTagRelations.updateMany({
      where: {
        id_product_tag_relation: {
          in: relationIdsToReactivate
        }
      },
      data: {
        status: true
      }
    });
  }

  const tagsToCreate = nextTagIds.filter(
    (tagId) => !activeTagIds.has(tagId) && !inactiveRelationByTagId.has(tagId)
  );

  if (tagsToCreate.length) {
    await tx.productTagRelations.createMany({
      data: tagsToCreate.map((tagId) => ({
        fk_product: productId,
        fk_product_tag: tagId,
        status: true
      }))
    });
  }
};

export const createProductService = async (authenticatedUserId, payload) => {
  const commerceId = await getAuthenticatedSellerStore(authenticatedUserId);
  const { data, tagIds, visibilityOverride } = await buildCreateProductData(payload);

  const initialLifecycleStatus = resolveInitialProductStatus();
  const initialVisibility =
    visibilityOverride ?? (initialLifecycleStatus === "active");

  const createdProduct = await prisma.$transaction(async (tx) => {
    const product = await tx.products.create({
      data: {
        ...data,
        fk_store: commerceId,
        visible: initialVisibility,
        status: true
      },
      select: { id_product: true }
    });

    if (tagIds.length) {
      await tx.productTagRelations.createMany({
        data: tagIds.map((tagId) => ({
          fk_product: product.id_product,
          fk_product_tag: tagId,
          status: true
        }))
      });
    }

    return getProductResponseByIdService(product.id_product, tx);
  });

  if (!createdProduct) {
    throw { status: 500, message: "No se pudo recuperar el producto creado" };
  }

  return mapProductResponse(createdProduct);
};

export const updateProductService = async (
  authenticatedUserId,
  requestedProductId,
  payload
) => {
  const sellerStoreId = await getAuthenticatedSellerStore(authenticatedUserId);
  const existingProduct = await getExistingProductForUpdateService(requestedProductId);

  if (existingProduct.fk_store !== sellerStoreId) {
    throw { status: 403, message: "No tiene permisos para editar este producto" };
  }

  const {
    dataToUpdate,
    nextTagIds
  } = await buildUpdateProductData(payload);

  const updatedProduct = await prisma.$transaction(async (tx) => {
    if (Object.keys(dataToUpdate).length > 0) {
      await tx.products.update({
        where: {
          id_product: existingProduct.id_product
        },
        data: dataToUpdate
      });
    }

    if (nextTagIds !== undefined) {
      await syncProductTagsService(tx, existingProduct.id_product, nextTagIds);
    }

    return getProductResponseByIdService(existingProduct.id_product, tx);
  });

  if (!updatedProduct) {
    throw { status: 500, message: "No se pudo recuperar el producto actualizado" };
  }

  return mapProductResponse(updatedProduct);
};

/** esta funcion recibe un filtro (search) y retorna los productos con status=true y visible=true*/
export const getProductsSearchService = async (filters) => {
  const search = filters.search?.toString().trim();
  const categoryIdRaw = filters.categoryId ?? filters.category_id ?? filters.fk_product_category;
  
  //Paginacion
  const page = sanitizePaginationValue(filters.page, DEFAULT_PRODUCTS_PAGE);
  const requestedLimit = sanitizePaginationValue(
    filters.limit,
    DEFAULT_PRODUCTS_LIMIT
  );
  const limit = Math.min(requestedLimit, MAX_PRODUCTS_LIMIT); //por defecto trae hasta 20 productos
  const skip = (page - 1) * limit;

  const where = { status: true, visible: true };

  let orderBy = {id_product: 'desc'}; // orden por defecto

  // filtro por categoria (id de ProductCategories)
  if (categoryIdRaw !== undefined && categoryIdRaw !== null && String(categoryIdRaw).trim() !== "") {
    const categoryId = Number(categoryIdRaw);
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      throw { status: 400, message: "categoryId debe ser un entero mayor a 0" };
    }
    where.fk_product_category = categoryId;
  }

  //si se le pasa un search, se busca en name y description
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } }
    ];

    // cambia el orden, solo si se busca o filtra por algun parametro
    orderBy = {
      _relevance: {
        fields: ["name"],
        search: search,
        sort: "desc"
      }
    };
  }

  const [totalProducts, products] = await Promise.all([
    prisma.products.count({ where }),
    prisma.products.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id_product: true,
        name: true,
        description: true,
        price: true,
        store: {
          select: {
            id_store: true,
            name: true
          }
        }
      }
    })
  ]);

  return {
    products,
  pagination: {
    totalProducts,
    page,
    limit,
    totalPages: Math.ceil(totalProducts/limit)
  }};
};


export const deleteProductService = async (authenticatedUserId, productId) => {
  const sellerStoreId = await getAuthenticatedSellerStore(authenticatedUserId);
  const existingProduct = await getExistingProductForUpdateService(productId);

  if (existingProduct.fk_store !== sellerStoreId) {
    throw new ForbiddenError("No tiene permisos para eliminar este producto");
  }

  await prisma.products.update({
    where: { id_product: existingProduct.id_product },
    data: { status: false, visible: false }
  });
};

export const getProductByIdService = async (id) => {
  const productId = parsePositiveInteger(id, "ID de producto");
  const product = await getProductResponseByIdService(productId, prisma, {
    requireVisible: true
  });

  if (!product) {
    return null;
  }

  return mapProductResponse(product);
};