import { prisma } from "../../../lib/prisma.js";
import { NotFoundError, ValidationError } from "../../../lib/errors.js";

const VALID_APPROVAL_STATUSES = ["PENDING", "ACTIVE", "REJECTED"];

const mapProductResponse = (product) => ({
  id: product.id_product,
  name: product.name,
  description: product.description,
  price: Number(product.price),
  visible: product.visible,
  approvalStatus: product.approval_status,
  rejectionReason: product.rejection_reason ?? null,
  category: product.product_category
    ? { id: product.product_category.id_product_category, name: product.product_category.name }
    : null,
  store: product.store
    ? { id: product.store.id_store, name: product.store.name }
    : null,
  reportCount: product._count?.product_reports ?? 0,
  latestReport: product.product_reports?.[0]
    ? {
        reason: product.product_reports[0].reason,
        description: product.product_reports[0].description ?? null,
        reportedAt: product.product_reports[0].created_at,
      }
    : null,
  createdAt: product.created_at,
});

const productSelect = {
  id_product: true,
  name: true,
  description: true,
  price: true,
  visible: true,
  approval_status: true,
  rejection_reason: true,
  created_at: true,
  product_category: {
    select: { id_product_category: true, name: true },
  },
  store: {
    select: { id_store: true, name: true, fk_user: true },
  },
  product_reports: {
    where: { status: true },
    orderBy: { created_at: "desc" },
    take: 1,
    select: { reason: true, description: true, created_at: true },
  },
  _count: {
    select: { product_reports: { where: { status: true } } },
  },
};

export const getProductsAdminService = async ({ search, approvalStatus }, pagination) => {
  const where = { status: true };

  if (search?.toString().trim()) {
    const term = search.toString().trim();
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { store: { name: { contains: term, mode: "insensitive" } } },
    ];
  }

  if (approvalStatus !== undefined) {
    const normalized = approvalStatus.toString().trim().toUpperCase();
    if (!VALID_APPROVAL_STATUSES.includes(normalized)) {
      throw new ValidationError(
        `approvalStatus inválido. Valores permitidos: ${VALID_APPROVAL_STATUSES.join(", ")}`
      );
    }
    where.approval_status = normalized;
  }

  const { page, limit, skip } = pagination;

  const [total, products] = await Promise.all([
    prisma.products.count({ where }),
    prisma.products.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: productSelect,
    }),
  ]);

  return {
    data: products.map(mapProductResponse),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const updateProductApprovalStatusService = async (adminUserId, productId, { status, reason }) => {
  const resolvedProductId = Number(productId);
  if (!Number.isInteger(resolvedProductId) || resolvedProductId <= 0) {
    throw new ValidationError("productId debe ser un entero positivo");
  }

  const normalizedStatus = status?.toString().trim().toUpperCase();
  if (!["ACTIVE", "REJECTED"].includes(normalizedStatus)) {
    throw new ValidationError("status debe ser ACTIVE o REJECTED");
  }

  if (normalizedStatus === "REJECTED" && !reason?.toString().trim()) {
    throw new ValidationError("reason es requerido al rechazar un producto");
  }

  const product = await prisma.products.findFirst({
    where: { id_product: resolvedProductId, status: true },
    select: {
      id_product: true,
      name: true,
      approval_status: true,
      store: { select: { fk_user: true, name: true } },
    },
  });

  if (!product) {
    throw new NotFoundError("Producto no encontrado");
  }

  if (product.approval_status === normalizedStatus) {
    throw new ValidationError(
      `El producto ya tiene el estado ${normalizedStatus}`
    );
  }

  const isApproving = normalizedStatus === "ACTIVE";

  const updateData = {
    approval_status: normalizedStatus,
    visible: isApproving,
    rejection_reason: isApproving ? null : reason.toString().trim(),
  };

  const [updated] = await prisma.$transaction([
    prisma.products.update({
      where: { id_product: resolvedProductId },
      data: updateData,
      select: productSelect,
    }),
    // Notificar al vendedor solo al rechazar
    ...(isApproving
      ? []
      : [
          prisma.notifications.create({
            data: {
              fk_user: product.store.fk_user,
              title: "Producto rechazado",
              message: `Tu producto "${product.name}" ha sido rechazado. Motivo: ${reason.toString().trim()}`,
            },
          }),
        ]),
  ]);

  return mapProductResponse(updated);
};