import { vi, describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../../../src/lib/prisma.js";
import {
  getProductsAdminService,
  updateProductApprovalStatusService,
} from "../../../src/modules/admin/products/admin-products.service.js";
import { NotFoundError, ValidationError } from "../../../src/lib/errors.js";

// ─── MOCK DE PRISMA ──────────────────────────────────────────────────────────

vi.mock("../../../src/lib/prisma.js", () => ({
  prisma: {
    products: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    notifications: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// ─── DATOS DE PRUEBA ─────────────────────────────────────────────────────────

const mockPagination = { page: 1, limit: 10, skip: 0 };

const mockProduct = {
  id_product: 1,
  name: "iPhone 15 Pro Max",
  description: "Nuevo, sellado",
  price: 10500000,
  visible: false,
  approval_status: "PENDING",
  rejection_reason: null,
  created_at: new Date("2024-01-20"),
  product_category: { id_product_category: 1, name: "Electrónicos" },
  store: { id_store: 10, name: "TechStore", fk_user: 5 },
  product_reports: [
    {
      reason: "DEFECTIVE",
      description: "Precio sospechosamente bajo",
      created_at: new Date("2024-01-20"),
    },
  ],
  _count: { product_reports: 3 },
};

const mockProductApproved = {
  ...mockProduct,
  approval_status: "ACTIVE",
  visible: true,
  rejection_reason: null,
};

const mockProductRejected = {
  ...mockProduct,
  approval_status: "REJECTED",
  visible: false,
  rejection_reason: "Producto falsificado confirmado",
};

// ─── getProductsAdminService ─────────────────────────────────────────────────

describe("getProductsAdminService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna todos los productos cuando no se aplican filtros", async () => {
    prisma.products.count.mockResolvedValue(4);
    prisma.products.findMany.mockResolvedValue([mockProduct]);

    const result = await getProductsAdminService({}, mockPagination);

    expect(result.data).toHaveLength(1);
    expect(result.pagination.total).toBe(4);
  });

  it("retorna estructura correcta con data y pagination", async () => {
    prisma.products.count.mockResolvedValue(1);
    prisma.products.findMany.mockResolvedValue([mockProduct]);

    const result = await getProductsAdminService({}, mockPagination);

    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("pagination");
    expect(result.pagination).toMatchObject({
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    });
  });

  it("mapea correctamente todos los campos del producto", async () => {
    prisma.products.count.mockResolvedValue(1);
    prisma.products.findMany.mockResolvedValue([mockProduct]);

    const result = await getProductsAdminService({}, mockPagination);
    const product = result.data[0];

    expect(product).toMatchObject({
      id: 1,
      name: "iPhone 15 Pro Max",
      price: 10500000,
      approvalStatus: "PENDING",
      rejectionReason: null,
      reportCount: 3,
      category: { id: 1, name: "Electrónicos" },
      store: { id: 10, name: "TechStore" },
    });
    expect(product.latestReport).toMatchObject({
      reason: "DEFECTIVE",
      description: "Precio sospechosamente bajo",
    });
  });

  it("retorna latestReport null cuando el producto no tiene reportes", async () => {
    prisma.products.count.mockResolvedValue(1);
    prisma.products.findMany.mockResolvedValue([
      { ...mockProduct, product_reports: [], _count: { product_reports: 0 } },
    ]);

    const result = await getProductsAdminService({}, mockPagination);

    expect(result.data[0].latestReport).toBeNull();
    expect(result.data[0].reportCount).toBe(0);
  });

  it("retorna array vacío cuando no hay productos", async () => {
    prisma.products.count.mockResolvedValue(0);
    prisma.products.findMany.mockResolvedValue([]);

    const result = await getProductsAdminService({}, mockPagination);

    expect(result.data).toEqual([]);
    expect(result.pagination.totalPages).toBe(0);
  });

  // ── Filtro search ────────────────────────────────────────────────────────

  it("aplica filtro OR por nombre de producto y nombre de tienda", async () => {
    prisma.products.count.mockResolvedValue(1);
    prisma.products.findMany.mockResolvedValue([mockProduct]);

    await getProductsAdminService({ search: "iphone" }, mockPagination);

    expect(prisma.products.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { name: { contains: "iphone", mode: "insensitive" } },
            { store: { name: { contains: "iphone", mode: "insensitive" } } },
          ],
        }),
      })
    );
  });

  it("ignora search cuando es string vacío o solo espacios", async () => {
    prisma.products.count.mockResolvedValue(1);
    prisma.products.findMany.mockResolvedValue([mockProduct]);

    await getProductsAdminService({ search: "   " }, mockPagination);

    expect(prisma.products.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ OR: expect.anything() }),
      })
    );
  });

  // ── Filtro approvalStatus ────────────────────────────────────────────────

  it("filtra por approvalStatus PENDING correctamente", async () => {
    prisma.products.count.mockResolvedValue(2);
    prisma.products.findMany.mockResolvedValue([mockProduct]);

    await getProductsAdminService({ approvalStatus: "PENDING" }, mockPagination);

    expect(prisma.products.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ approval_status: "PENDING" }),
      })
    );
  });

  it("normaliza approvalStatus a mayúsculas antes de filtrar", async () => {
    prisma.products.count.mockResolvedValue(1);
    prisma.products.findMany.mockResolvedValue([mockProduct]);

    await getProductsAdminService({ approvalStatus: "pending" }, mockPagination);

    expect(prisma.products.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ approval_status: "PENDING" }),
      })
    );
  });

  it("lanza ValidationError cuando approvalStatus no es válido", async () => {
    await expect(
      getProductsAdminService({ approvalStatus: "SUSPENDIDO" }, mockPagination)
    ).rejects.toThrow(ValidationError);
  });

  it("acepta todos los approvalStatus válidos: PENDING, ACTIVE, REJECTED", async () => {
    prisma.products.count.mockResolvedValue(0);
    prisma.products.findMany.mockResolvedValue([]);

    for (const approvalStatus of ["PENDING", "ACTIVE", "REJECTED"]) {
      await expect(
        getProductsAdminService({ approvalStatus }, mockPagination)
      ).resolves.not.toThrow();
    }
  });

  // ── Paginación ───────────────────────────────────────────────────────────

  it("calcula totalPages correctamente", async () => {
    prisma.products.count.mockResolvedValue(25);
    prisma.products.findMany.mockResolvedValue([]);

    const result = await getProductsAdminService({}, { page: 1, limit: 10, skip: 0 });

    expect(result.pagination.totalPages).toBe(3);
  });

  it("pasa skip y limit correctamente a findMany", async () => {
    prisma.products.count.mockResolvedValue(30);
    prisma.products.findMany.mockResolvedValue([]);

    await getProductsAdminService({}, { page: 3, limit: 10, skip: 20 });

    expect(prisma.products.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 })
    );
  });

  it("ordena los resultados por created_at descendente", async () => {
    prisma.products.count.mockResolvedValue(1);
    prisma.products.findMany.mockResolvedValue([mockProduct]);

    await getProductsAdminService({}, mockPagination);

    expect(prisma.products.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { created_at: "desc" } })
    );
  });
});

// ─── updateProductApprovalStatusService ──────────────────────────────────────

describe("updateProductApprovalStatusService", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Validaciones de entrada ──────────────────────────────────────────────

  it("lanza ValidationError cuando productId no es un entero positivo", async () => {
    await expect(
      updateProductApprovalStatusService(1, -1, { status: "ACTIVE" })
    ).rejects.toThrow(ValidationError);
  });

  it("lanza ValidationError cuando status no es ACTIVE ni REJECTED", async () => {
    await expect(
      updateProductApprovalStatusService(1, 1, { status: "PENDING" })
    ).rejects.toThrow(ValidationError);
  });

  it("lanza ValidationError cuando se rechaza sin reason", async () => {
    prisma.products.findFirst.mockResolvedValue(mockProduct);

    await expect(
      updateProductApprovalStatusService(1, 1, { status: "REJECTED", reason: "" })
    ).rejects.toThrow(ValidationError);
  });

  it("lanza ValidationError cuando se rechaza sin enviar reason", async () => {
    await expect(
      updateProductApprovalStatusService(1, 1, { status: "REJECTED" })
    ).rejects.toThrow(ValidationError);
  });

  // ── Producto no encontrado ───────────────────────────────────────────────

  it("lanza NotFoundError cuando el producto no existe", async () => {
    prisma.products.findFirst.mockResolvedValue(null);

    await expect(
      updateProductApprovalStatusService(1, 99, { status: "ACTIVE" })
    ).rejects.toThrow(NotFoundError);
  });

  // ── Estado ya asignado ───────────────────────────────────────────────────

  it("lanza ValidationError cuando el producto ya tiene el estado ACTIVE", async () => {
    prisma.products.findFirst.mockResolvedValue({
      ...mockProduct,
      approval_status: "ACTIVE",
    });

    await expect(
      updateProductApprovalStatusService(1, 1, { status: "ACTIVE" })
    ).rejects.toThrow(ValidationError);
  });

  it("lanza ValidationError cuando el producto ya tiene el estado REJECTED", async () => {
    prisma.products.findFirst.mockResolvedValue({
      ...mockProduct,
      approval_status: "REJECTED",
    });

    await expect(
      updateProductApprovalStatusService(1, 1, { status: "REJECTED", reason: "Motivo" })
    ).rejects.toThrow(ValidationError);
  });

  // ── Aprobación ───────────────────────────────────────────────────────────

  it("aprueba el producto correctamente: visible=true, rejection_reason=null", async () => {
    prisma.products.findFirst.mockResolvedValue(mockProduct);
    prisma.$transaction.mockResolvedValue([mockProductApproved]);

    const result = await updateProductApprovalStatusService(1, 1, { status: "ACTIVE" });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(result.approvalStatus).toBe("ACTIVE");
    expect(result.visible).toBe(true);
    expect(result.rejectionReason).toBeNull();
  });

  it("al aprobar NO crea notificación", async () => {
    prisma.products.findFirst.mockResolvedValue(mockProduct);
    prisma.$transaction.mockImplementation(async (ops) => {
      // Solo debe haber 1 operación (update), sin notificación
      expect(ops).toHaveLength(1);
      return [mockProductApproved];
    });

    await updateProductApprovalStatusService(1, 1, { status: "ACTIVE" });
  });

  // ── Rechazo ──────────────────────────────────────────────────────────────

  it("rechaza el producto correctamente: visible=false, rejection_reason asignado", async () => {
    prisma.products.findFirst.mockResolvedValue(mockProduct);
    prisma.$transaction.mockResolvedValue([mockProductRejected]);

    const result = await updateProductApprovalStatusService(1, 1, {
      status: "REJECTED",
      reason: "Producto falsificado confirmado",
    });

    expect(result.approvalStatus).toBe("REJECTED");
    expect(result.visible).toBe(false);
    expect(result.rejectionReason).toBe("Producto falsificado confirmado");
  });

  it("al rechazar crea notificación para el vendedor", async () => {
    prisma.products.findFirst.mockResolvedValue(mockProduct);
    prisma.$transaction.mockImplementation(async (ops) => {
      // Debe haber 2 operaciones: update + notification
      expect(ops).toHaveLength(2);
      return [mockProductRejected];
    });

    await updateProductApprovalStatusService(1, 1, {
      status: "REJECTED",
      reason: "Producto falsificado",
    });
  });

  it("normaliza status a mayúsculas antes de procesar", async () => {
    prisma.products.findFirst.mockResolvedValue(mockProduct);
    prisma.$transaction.mockResolvedValue([mockProductApproved]);

    await expect(
      updateProductApprovalStatusService(1, 1, { status: "active" })
    ).resolves.not.toThrow();
  });
});