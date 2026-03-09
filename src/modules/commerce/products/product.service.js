import { prisma } from "../../../lib/prisma.js";
import { validateProductCategoryService } from "../product-categories/product-category.service.js";
import {
  parseProductTagIdsService,
  validateProductTagsService
} from "../product-tags/product-tag.service.js";

const DEFAULT_PRODUCT_INITIAL_STATUS = "pending";
const ALLOWED_PRODUCT_INITIAL_STATUS = new Set(["pending", "active"]);

const resolveInitialProductStatus = () => {
  const configuredStatus = String(
    process.env.PRODUCT_INITIAL_STATUS || DEFAULT_PRODUCT_INITIAL_STATUS
  ).toLowerCase();

  return ALLOWED_PRODUCT_INITIAL_STATUS.has(configuredStatus)
    ? configuredStatus
    : DEFAULT_PRODUCT_INITIAL_STATUS;
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
  const lifecycleStatus = product.visible ? "active" : "pending";

  return {
    id: product.id_product,
    name: product.name,
    description: product.description,
    price: Number(product.price),
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
    commerceId: product.fk_store,
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

export const createProductService = async (authenticatedUserId, payload) => {
  const name = payload?.name?.toString().trim();
  const price = Number(payload?.price);
  const categoryId = Number(payload?.categoryId);
  const description =
    payload?.description !== undefined && payload?.description !== null
      ? payload.description.toString().trim()
      : null;

  let quantity = null;
  if (payload?.quantity !== undefined && payload?.quantity !== null && payload?.quantity !== "") {
    quantity = Number(payload.quantity);
  }

  if (!name) {
    throw { status: 400, message: "name es requerido" };
  }

  if (payload?.price === undefined || payload?.price === null || payload?.price === "") {
    throw { status: 400, message: "price es requerido" };
  }

  if (!Number.isFinite(price) || price <= 0) {
    throw { status: 400, message: "price debe ser mayor a 0" };
  }

  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    throw { status: 400, message: "categoryId es requerido y debe ser numerico" };
  }

  if (quantity !== null && (!Number.isInteger(quantity) || quantity < 0)) {
    throw { status: 400, message: "quantity debe ser un entero mayor o igual a 0" };
  }

  const tagIds = parseProductTagIdsService(payload?.tags);
  const commerceId = await getAuthenticatedSellerStore(authenticatedUserId);
  const visibilityOverride = parseVisibilityOverride(payload);

  await validateProductCategoryService(categoryId);
  await validateProductTagsService(tagIds);

  const initialLifecycleStatus = resolveInitialProductStatus();
  const initialVisibility = visibilityOverride ?? (initialLifecycleStatus === "active");

  const createdProduct = await prisma.$transaction(async (tx) => {
    const product = await tx.products.create({
      data: {
        fk_product_category: categoryId,
        fk_store: commerceId,
        name,
        description,
        price,
        quantity,
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

    return tx.products.findUnique({
      where: { id_product: product.id_product },
      select: {
        id_product: true,
        name: true,
        description: true,
        price: true,
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
        }
      }
    });
  });

  if (!createdProduct) {
    throw { status: 500, message: "No se pudo recuperar el producto creado" };
  }

  return mapProductResponse(createdProduct);
};

export const getProductByIdService = async (id) => {
  // validaciones básicas
    if (!id) {
      throw { status: 400, message: "ID de tienda es requerido" };
    }
    if (isNaN(Number(id))) {
      throw { status: 400, message: "ID de tienda debe ser un número" };
    }

  const product = await prisma.products.findUnique({
    where: { id_product: Number(id) },
    select: {
      id_product: true,
      name: true,
      description: true,
      price: true,
      quantity: true,
      visible: true,
      status: true,
      fk_product_category: true,
      fk_store: true,
      created_at: true,
      updated_at: true,
      product_category: {
        select: { id_product_category: true, name: true, status: true }
      },
      product_tag_relations: {
        where: { status: true },
        select: {
          product_tag: {
            select: { id_product_tag: true, name: true }
          }
        }
      },
      product_reviews: {
        where: { status: true },
        select: { rating: true }
      }
    }
  });

  if (!product || !product.status) {
    throw { status: 404, message: "Producto no encontrado" };
  }

  const reviewCount = product.product_reviews.length;
  const averageRating =
    reviewCount > 0
      ? Number(
          (
            product.product_reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
          ).toFixed(2)
        )
      : null;

  return {
    ...mapProductResponse(product),
    averageRating,
    reviewCount
  };
};