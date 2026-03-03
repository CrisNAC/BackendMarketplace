import { prisma } from "../../../lib/prisma.js";

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

const mapProductResponse = (product) => {
  const lifecycleStatus = product.visible ? "active" : "pending";

  return {
    id: product.id_product,
    name: product.name,
    description: product.description,
    price: Number(product.price),
    categoryId: product.fk_product_category,
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

const parseTagIds = (tags) => {
  if (tags === undefined || tags === null) {
    return [];
  }

  if (!Array.isArray(tags)) {
    throw { status: 400, message: "tags debe ser un arreglo de ids" };
  }

  const parsed = tags.map((tag) => Number(tag));
  if (parsed.some((tagId) => !Number.isInteger(tagId) || tagId <= 0)) {
    throw { status: 400, message: "Cada tag debe ser un id numerico valido" };
  }

  return [...new Set(parsed)];
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

const validateCategory = async (categoryId) => {
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    throw { status: 400, message: "categoryId debe ser un numero valido" };
  }

  const category = await prisma.productCategories.findUnique({
    where: { id_product_category: categoryId },
    select: { id_product_category: true, status: true }
  });

  if (!category || !category.status) {
    throw { status: 400, message: "categoryId no es valida" };
  }
};

const validateTags = async (tagIds) => {
  if (!tagIds.length) {
    return;
  }

  const existingTags = await prisma.productTags.findMany({
    where: {
      id_product_tag: { in: tagIds },
      status: true
    },
    select: { id_product_tag: true }
  });

  if (existingTags.length !== tagIds.length) {
    throw { status: 400, message: "Uno o mas tags no son validos" };
  }
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

  const tagIds = parseTagIds(payload?.tags);
  const commerceId = await getAuthenticatedSellerStore(authenticatedUserId);

  await validateCategory(categoryId);
  await validateTags(tagIds);

  const initialLifecycleStatus = resolveInitialProductStatus();
  const initialVisibility = initialLifecycleStatus === "active";

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
