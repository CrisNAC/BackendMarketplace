import { prisma } from "../../../lib/prisma.js";
import { NotFoundError, ValidationError } from "../../../lib/errors.js";
import {
  getEffectiveProductPrice,
  getOriginalProductPrice,
  getOfferProductPrice
} from "../../../lib/product-pricing.js";
import { PAGINATION } from "../../../../constants/pagination.constant.js";

const DEFAULT_CATEGORY_ID = 1;

const assertCategoryIsMutable = (id) => {
  if (Number(id) === DEFAULT_CATEGORY_ID) {
    throw new ValidationError("La categoría sin categoría no puede modificarse");
  }
};

const normalizeAdminCategoryName = (name) => {
  if (typeof name !== "string" || name.trim().length === 0) {
    throw new ValidationError("El nombre de la categoría no puede estar vacío");
  }

  const normalizedName = name.trim();
  if (normalizedName.length > 100) {
    throw new ValidationError("El nombre de la categoría no puede superar 100 caracteres");
  }

  return normalizedName;
};

export const createAdminProductCategoryService = async (name) => {
  const normalizedName = normalizeAdminCategoryName(name);

  const existingCategory = await prisma.categories.findFirst({
    where: {
      name: {
        equals: normalizedName,
        mode: "insensitive"
      },
      status: true
    },
    select: { id_category: true }
  });

  if (existingCategory) {
    throw new ValidationError("Ya existe una categoría con ese nombre");
  }

  const createdCategory = await prisma.categories.create({
    data: {
      name: normalizedName,
      visible: true,
      status: true
    },
    select: {
      id_category: true,
      name: true,
      visible: true,
      status: true,
      created_at: true
    }
  });

  return {
    id: createdCategory.id_category,
    name: createdCategory.name,
    visible: createdCategory.visible,
    status: createdCategory.status,
    createdAt: createdCategory.created_at
  };
};

export const getAdminProductCategoryService = async (id) => {
  const category = await prisma.categories.findUnique({
    where: { id_category: id },
    select: {
      id_category: true,
      name: true,
      status: true,
      visible: true,
      created_at: true,
      updated_at: true,
      _count: { select: { product_categories: true } }
    }
  });
 
  if (!category) throw new NotFoundError("Categoría no encontrada");
 
  return {
    id: category.id_category,
    name: category.name,
    status: category.status,
    visible: category.visible,
    productCount: category._count.product_categories,
    createdAt: category.created_at,
    updatedAt: category.updated_at
  };
};
 
export const getAllCategories = async (filters = {}, categoryPagination = {}) => {
  const { visible, searchCategory } = filters;
 
  const where = {
    status: true // excluye categorías eliminadas
  };
 
  if (visible === "true") where.visible = true;
  else if (visible === "false") where.visible = false;
 
  if (searchCategory) {
    where.name = { contains: searchCategory, mode: "insensitive" };
  }
 
  const categorySkip = categoryPagination.skip ?? 0;
  const categoryLimit = categoryPagination.limit ?? PAGINATION.DEFAULT_LIMIT;
 
  const [categoryTotal, categories] = await Promise.all([
    prisma.categories.count({ where }),
    prisma.categories.findMany({
      where,
      skip: categorySkip,
      take: categoryLimit,
      orderBy: [{ name: "asc" }, { id_category: "asc" }],
      select: {
        id_category: true,
        name: true,
        status: true,
        visible: true,
        _count: { select: { product_categories: true } }
      }
    })
  ]);
 
  return {
    data: categories.map((c) => ({
      id: c.id_category,
      name: c.name,
      status: c.status,
      visible: c.visible,
      productCount: c._count.product_categories
    })),
    categoryTotal,
    categoryPage: categoryPagination.page ?? PAGINATION.DEFAULT_PAGE,
    categoryLimit,
    categoryTotalPages: Math.ceil(categoryTotal / categoryLimit)
  };
};
 
export const filterCategoriesWithProducts = async (
  filters = {},
  categoryPagination = {},
  productPagination = {}
) => {
  const { visible, search, searchCategory, searchProduct } = filters;
 
  const categoryWhere = {
    status: true // excluye categorías eliminadas (status=false)
  };
 
  if (visible === "true") categoryWhere.visible = true;
  else if (visible === "false") categoryWhere.visible = false;
 
  // searchCategory filtra categorías, independiente de search
  if (searchCategory) {
    categoryWhere.name = { contains: searchCategory, mode: "insensitive" };
  }
 
  const productWhere = { status: true };
 
  if (search) {
    categoryWhere.OR = [
      { name: { contains: search, mode: "insensitive" } },
      {
        product_categories: {
          some: {
            status: true,
            product: {
              name: { contains: search, mode: "insensitive" },
              status: true
            }
          }
        }
      }
    ];
  }
 
  // search o searchProduct filtran productos de forma independiente
  if (search) {
    productWhere.name = { contains: search, mode: "insensitive" };
  } else if (searchProduct) {
    productWhere.name = { contains: searchProduct, mode: "insensitive" };
  }
 
  const categorySkip = categoryPagination.skip ?? 0;
  const categoryLimit = categoryPagination.limit ?? PAGINATION.DEFAULT_LIMIT;
  const productSkip = productPagination.skip ?? 0;
  const productLimit = productPagination.limit ?? PAGINATION.DEFAULT_LIMIT;
 
  const [categoryTotal, categories] = await Promise.all([
    prisma.categories.count({ where: categoryWhere }),
    prisma.categories.findMany({
      where: categoryWhere,
      skip: categorySkip,
      take: categoryLimit,
      orderBy: [{ name: "asc" }, { id_category: "asc" }],
 
      select: {
        id_category: true,
        name: true,
        status: true,
        visible: true,
        product_categories: {
          where: {
            status: true,
            product: productWhere
          },
          skip: productSkip,
          take: productLimit,
          select: {
            product: {
              select: {
                id_product: true,
                name: true,
                price: true,
                offer_price: true,
                is_offer: true,
                status: true,
                visible: true
              }
            }
          }
        }
      }
    })
  ]);
 
  const categoryIds = categories.map((c) => c.id_category);

  const countRows = await prisma.productCategories.groupBy({
    by: ["fk_category"],
    where: {
      fk_category: { in: categoryIds },
      status: true,
      product: productWhere
    },
    _count: { fk_product: true }
  });

  const countMap = new Map(
    countRows.map((row) => [row.fk_category, row._count.fk_product])
  );

  return {
    data: categories.map((c) => {
      const productCount = countMap.get(c.id_category) ?? 0;
      return {
        id: c.id_category,
        name: c.name,
        status: c.status,
        visible: c.visible,
        productCount,
        products: {
          data: c.product_categories.map((relation) => relation.product).map((p) => ({
            id: p.id_product,
            name: p.name,
            price: getEffectiveProductPrice(p),
            originalPrice: getOriginalProductPrice(p),
            offerPrice: getOfferProductPrice(p),
            isOffer: Boolean(p.is_offer),
            status: p.status,
            visible: p.visible
          })),
          total: productCount,
          productPage: productPagination.page ?? PAGINATION.DEFAULT_PAGE,
          productLimit,
          productTotalPages: Math.ceil(productCount / productLimit)
        }
      };
    }),
    categoryTotal,
    categoryPage: categoryPagination.page ?? PAGINATION.DEFAULT_PAGE,
    categoryLimit,
    categoryTotalPages: Math.ceil(categoryTotal / categoryLimit)
  };
};
 
export const deleteAdminProductCategoryService = async (id) => {
  assertCategoryIsMutable(id);

  const category = await prisma.categories.findUnique({
    where: { id_category: id }
  });
 
  if (!category) throw new NotFoundError("Categoría no encontrada");
 
  await prisma.$transaction([
    prisma.productCategories.deleteMany({
      where: { fk_category: id }
    }),
    prisma.categories.update({
      where: { id_category: id },
      data: {
        status: false,
        visible: false
      }
    })
  ]);
};
 
const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
 
const normalizeUpdatePayload = (payload) => {
  if (!isPlainObject(payload)) {
    throw new ValidationError("Body inválido");
  }
 
  const data = {};
 
  if (payload.name !== undefined) {
    if (typeof payload.name !== "string") {
      throw new ValidationError("name debe ser texto");
    }
 
    const normalizedName = payload.name.trim();
    if (!normalizedName) {
      throw new ValidationError("name no puede estar vacío");
    }
    if (normalizedName.length > 100) {
      throw new ValidationError("name no puede superar 100 caracteres");
    }
 
    data.name = normalizedName;
  }
 
  if (payload.visible !== undefined) {
    if (typeof payload.visible !== "boolean") {
      throw new ValidationError("visible debe ser boolean");
    }
    data.visible = payload.visible;
  }
 
  if (Object.keys(data).length === 0) {
    throw new ValidationError("Debe enviar al menos uno: name o visible");
  }
 
  return data;
};
 
export const updateAdminProductCategoryService = async (id, payload) => {
  assertCategoryIsMutable(id);

  const data = normalizeUpdatePayload(payload);
 
  const category = await prisma.categories.findUnique({
    where: { id_category: id },
    select: { id_category: true }
  });
 
  if (!category) throw new NotFoundError("Categoría no encontrada");
 
  const updated = await prisma.categories.update({
    where: { id_category: id },
    data,
    select: {
      id_category: true,
      name: true,
      visible: true,
      created_at: true,
      updated_at: true
    }
  });
 
  return {
    id: updated.id_category,
    name: updated.name,
    visible: updated.visible,
    createdAt: updated.created_at,
    updatedAt: updated.updated_at
  };
};

const normalizeCategoryRequestDecision = (decision) => {
  if (typeof decision !== "string") {
    throw new ValidationError("decision debe ser texto");
  }

  const normalizedDecision = decision.trim().toLowerCase();
  if (!["approve", "reject"].includes(normalizedDecision)) {
    throw new ValidationError("decision debe ser 'approve' o 'reject'");
  }

  return normalizedDecision;
};

export const processAdminCategoryRequestService = async (id, decision) => {
  assertCategoryIsMutable(id);

  const normalizedDecision = normalizeCategoryRequestDecision(decision);

  const category = await prisma.categories.findUnique({
    where: { id_category: id },
    select: {
      id_category: true,
      name: true,
      visible: true,
      status: true,
      created_at: true,
      updated_at: true
    }
  });

  if (!category) {
    throw new NotFoundError("Solicitud de categoría no encontrada");
  }

  const isPendingRequest = category.status === true && category.visible === false;
  if (!isPendingRequest) {
    throw new ValidationError("La solicitud ya fue procesada");
  }

  let updatedCategory;

  if (normalizedDecision === "approve") {
    updatedCategory = await prisma.categories.update({
      where: { id_category: id },
      data: {
        visible: true,
        status: true
      },
      select: {
        id_category: true,
        name: true,
        visible: true,
        status: true,
        created_at: true,
        updated_at: true
      }
    });
  } else {
    const [, rejectedCategory] = await prisma.$transaction([
      prisma.productCategories.deleteMany({
        where: { fk_category: id }
      }),
      prisma.categories.update({
        where: { id_category: id },
        data: {
          visible: false,
          status: false
        },
        select: {
          id_category: true,
          name: true,
          visible: true,
          status: true,
          created_at: true,
          updated_at: true
        }
      })
    ]);

    updatedCategory = rejectedCategory;
  }

  return {
    id: updatedCategory.id_category,
    name: updatedCategory.name,
    visible: updatedCategory.visible,
    status: updatedCategory.status,
    decision: normalizedDecision,
    createdAt: updatedCategory.created_at,
    updatedAt: updatedCategory.updated_at
  };
};
