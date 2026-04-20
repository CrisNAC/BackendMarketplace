import { prisma } from "../../../lib/prisma.js";
import { NotFoundError, ValidationError } from "../../../lib/errors.js";
import {
  getEffectiveProductPrice,
  getOriginalProductPrice,
  getOfferProductPrice
} from "../../../lib/product-pricing.js";
import { PAGINATION } from "../../../utils/contants/pagination.constant.js";
 
export const getAdminProductCategoryService = async (id) => {
  const category = await prisma.productCategories.findUnique({
    where: { id_product_category: id },
    select: {
      id_product_category: true,
      name: true,
      status: true,
      visible: true,
      created_at: true,
      updated_at: true,
      _count: { select: { products: true } }
    }
  });
 
  if (!category) throw new NotFoundError("Categoría no encontrada");
 
  return {
    id: category.id_product_category,
    name: category.name,
    status: category.status,
    visible: category.visible,
    productCount: category._count.products,
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
    prisma.productCategories.count({ where }),
    prisma.productCategories.findMany({
      where,
      skip: categorySkip,
      take: categoryLimit,
      orderBy: [{ name: "asc" }, { id_product_category: "asc" }],
      select: {
        id_product_category: true,
        name: true,
        status: true,
        visible: true,
        _count: { select: { products: true } }
      }
    })
  ]);
 
  return {
    data: categories.map((c) => ({
      id: c.id_product_category,
      name: c.name,
      status: c.status,
      visible: c.visible,
      productCount: c._count.products
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
        products: {
          some: {
            name: { contains: search, mode: "insensitive" },
            status: true
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
    prisma.productCategories.count({ where: categoryWhere }),
    prisma.productCategories.findMany({
      where: categoryWhere,
      skip: categorySkip,
      take: categoryLimit,
      orderBy: [{ name: "asc" }, { id_product_category: "asc" }],
 
      select: {
        id_product_category: true,
        name: true,
        status: true,
        visible: true,
        _count: { select: { products: true } },
        products: {
          where: productWhere,
          skip: productSkip,
          take: productLimit,
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
    })
  ]);
 
  const productCounts = await Promise.all(
    categories.map((c) =>
      prisma.products.count({
        where: { ...productWhere, fk_product_category: c.id_product_category }
      })
    )
  );
 
  return {
    data: categories.map((c, i) => ({
      id: c.id_product_category,
      name: c.name,
      status: c.status,
      visible: c.visible,
      productCount: c._count.products,
      products: {
        data: c.products.map((p) => ({
          id: p.id_product,
          name: p.name,
          price: getEffectiveProductPrice(p),
          originalPrice: getOriginalProductPrice(p),
          offerPrice: getOfferProductPrice(p),
          isOffer: Boolean(p.is_offer),
          status: p.status,
          visible: p.visible
        })),
        total: productCounts[i] ?? 0,
        productPage: productPagination.page ?? PAGINATION.DEFAULT_PAGE,
        productLimit,
        productTotalPages: Math.ceil((productCounts[i] ?? 0) / productLimit)
      }
    })),
    categoryTotal,
    categoryPage: categoryPagination.page ?? PAGINATION.DEFAULT_PAGE,
    categoryLimit,
    categoryTotalPages: Math.ceil(categoryTotal / categoryLimit)
  };
};
 
export const deleteAdminProductCategoryService = async (id) => {
  if (id === 1) {
    throw new ValidationError("No se puede eliminar la categoría Sin categoría");
  }
 
  const category = await prisma.productCategories.findUnique({
    where: { id_product_category: id }
  });
 
  if (!category) throw new NotFoundError("Categoría no encontrada");
 
  await prisma.$transaction([
    prisma.products.updateMany({
      where: { fk_product_category: id },
      data: { fk_product_category: 1 }
    }),
    prisma.productCategories.update({
      where: { id_product_category: id },
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
  const data = normalizeUpdatePayload(payload);
 
  const category = await prisma.productCategories.findUnique({
    where: { id_product_category: id },
    select: { id_product_category: true }
  });
 
  if (!category) throw new NotFoundError("Categoría no encontrada");
 
  const updated = await prisma.productCategories.update({
    where: { id_product_category: id },
    data,
    select: {
      id_product_category: true,
      name: true,
      visible: true,
      created_at: true,
      updated_at: true
    }
  });
 
  return {
    id: updated.id_product_category,
    name: updated.name,
    visible: updated.visible,
    createdAt: updated.created_at,
    updatedAt: updated.updated_at
  };
};
 