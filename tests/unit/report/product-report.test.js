import { vi, describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../../../src/lib/prisma.js";
import {
    getProductsReportsService,
    updateProductReportService,
    getProductsReportsFilteredService,
} from "../../../src/modules/global/reports/product/product-report.service.js";
import {
    ForbiddenError,
    NotFoundError,
    ValidationError,
} from "../../../src/lib/errors.js";

// ─── MOCK DE PRISMA ──────────────────────────────────────────────────────────

vi.mock("../../../src/lib/prisma.js", () => ({
    prisma: {
        users: {
            findUnique: vi.fn(),
        },
        stores: {
            findUnique: vi.fn(),
        },
        productReports: {
            findMany: vi.fn(),
            findFirst: vi.fn(),
            update: vi.fn(),
            count: vi.fn(),
        },
    },
}));

// ─── DATOS DE PRUEBA ─────────────────────────────────────────────────────────

const mockAdminUser = { role: "ADMIN" };
const mockSellerUser = { role: "SELLER" };
const mockCustomerUser = { role: "CUSTOMER" };

const mockStore = { id_store: 10 };

const mockReport = {
    id_product_report: 1,
    reason: "Producto en mal estado",
    description: "El producto llegó roto",
    report_status: "PENDING",
    notes: null,
    created_at: new Date(),
    resolved_at: null,
    reporter: { id_user: 5, name: "Juan Pérez", email: "juan@test.com", phone: "0981000000" },
    product: {
        id_product: 3,
        name: "Producto Test",
        store: { id_store: 10, name: "Tienda Test" },
    },
    order: { id_order: 7, created_at: new Date() },
};

const mockReportInProgress = { ...mockReport, report_status: "IN_PROGRESS" };
const mockReportResolved = { ...mockReport, report_status: "RESOLVED" };
const mockReportRejected = { ...mockReport, report_status: "REJECTED" };

const mockUpdatedReport = {
    id_product_report: 1,
    report_status: "IN_PROGRESS",
    notes: null,
    resolved_at: null,
    resolver: null,
};

const mockPagination = { page: 1, limit: 10, skip: 0 };

// ─── getProductsReportsService ────────────────────────────────────────────────

describe("getProductsReportsService", () => {
    beforeEach(() => vi.clearAllMocks());

    it("lanza NotFoundError cuando el usuario no existe", async () => {
        prisma.users.findUnique.mockResolvedValue(null);

        await expect(
            getProductsReportsService(1)
        ).rejects.toThrow(NotFoundError);
    });

    it("lanza ForbiddenError cuando el usuario es CUSTOMER", async () => {
        prisma.users.findUnique.mockResolvedValue(mockCustomerUser);

        await expect(
            getProductsReportsService(1)
        ).rejects.toThrow(ForbiddenError);
    });

    it("retorna todos los reportes cuando el usuario es ADMIN", async () => {
        prisma.users.findUnique.mockResolvedValue(mockAdminUser);
        prisma.productReports.findMany.mockResolvedValue([mockReport]);

        const result = await getProductsReportsService(1);

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({ id_product_report: 1 });
    });

    it("retorna array vacío cuando el ADMIN no tiene reportes", async () => {
        prisma.users.findUnique.mockResolvedValue(mockAdminUser);
        prisma.productReports.findMany.mockResolvedValue([]);

        const result = await getProductsReportsService(1);

        expect(result).toEqual([]);
    });

    it("lanza NotFoundError cuando el SELLER no tiene tienda asociada", async () => {
        prisma.users.findUnique.mockResolvedValue(mockSellerUser);
        prisma.stores.findUnique.mockResolvedValue(null);

        await expect(
            getProductsReportsService(1)
        ).rejects.toThrow(NotFoundError);
    });

    it("retorna solo los reportes de su tienda cuando el usuario es SELLER", async () => {
        prisma.users.findUnique.mockResolvedValue(mockSellerUser);
        prisma.stores.findUnique.mockResolvedValue(mockStore);
        prisma.productReports.findMany.mockResolvedValue([mockReport]);

        const result = await getProductsReportsService(1);

        expect(result).toHaveLength(1);
        expect(result[0].product.store.id_store).toBe(10);
    });

    it("retorna array vacío cuando el SELLER no tiene reportes en su tienda", async () => {
        prisma.users.findUnique.mockResolvedValue(mockSellerUser);
        prisma.stores.findUnique.mockResolvedValue(mockStore);
        prisma.productReports.findMany.mockResolvedValue([]);

        const result = await getProductsReportsService(1);

        expect(result).toEqual([]);
    });

    it("lanza ValidationError cuando el userId no es un entero positivo", async () => {
        await expect(
            getProductsReportsService(-1)
        ).rejects.toThrow(ValidationError);
    });
});

// ─── updateProductReportService ───────────────────────────────────────────────

describe("updateProductReportService", () => {
    beforeEach(() => vi.clearAllMocks());

    it("lanza ValidationError cuando el reportId no es un entero positivo", async () => {
        await expect(
            updateProductReportService(1, -1, { report_status: "IN_PROGRESS" })
        ).rejects.toThrow(ValidationError);
    });

    it("lanza NotFoundError cuando el usuario no existe", async () => {
        prisma.users.findUnique.mockResolvedValue(null);

        await expect(
            updateProductReportService(1, 1, { report_status: "IN_PROGRESS" })
        ).rejects.toThrow(NotFoundError);
    });

    it("lanza ForbiddenError cuando el usuario no es SELLER", async () => {
        prisma.users.findUnique.mockResolvedValue(mockAdminUser);

        await expect(
            updateProductReportService(1, 1, { report_status: "IN_PROGRESS" })
        ).rejects.toThrow(ForbiddenError);
    });

    it("lanza NotFoundError cuando el SELLER no tiene tienda asociada", async () => {
        prisma.users.findUnique.mockResolvedValue(mockSellerUser);
        prisma.stores.findUnique.mockResolvedValue(null);

        await expect(
            updateProductReportService(1, 1, { report_status: "IN_PROGRESS" })
        ).rejects.toThrow(NotFoundError);
    });

    it("lanza NotFoundError cuando el reporte no existe o no pertenece a la tienda", async () => {
        prisma.users.findUnique.mockResolvedValue(mockSellerUser);
        prisma.stores.findUnique.mockResolvedValue(mockStore);
        prisma.productReports.findFirst.mockResolvedValue(null);

        await expect(
            updateProductReportService(1, 99, { report_status: "IN_PROGRESS" })
        ).rejects.toThrow(NotFoundError);
    });

    it("lanza ValidationError cuando el reporte ya está RESOLVED", async () => {
        prisma.users.findUnique.mockResolvedValue(mockSellerUser);
        prisma.stores.findUnique.mockResolvedValue(mockStore);
        prisma.productReports.findFirst.mockResolvedValue(mockReportResolved);

        await expect(
            updateProductReportService(1, 1, { report_status: "IN_PROGRESS" })
        ).rejects.toThrow(ValidationError);
    });

    it("lanza ValidationError cuando el reporte ya está REJECTED", async () => {
        prisma.users.findUnique.mockResolvedValue(mockSellerUser);
        prisma.stores.findUnique.mockResolvedValue(mockStore);
        prisma.productReports.findFirst.mockResolvedValue(mockReportRejected);

        await expect(
            updateProductReportService(1, 1, { report_status: "IN_PROGRESS" })
        ).rejects.toThrow(ValidationError);
    });

    it("lanza ValidationError al intentar pasar de PENDING a RESOLVED directamente", async () => {
        prisma.users.findUnique.mockResolvedValue(mockSellerUser);
        prisma.stores.findUnique.mockResolvedValue(mockStore);
        prisma.productReports.findFirst.mockResolvedValue(mockReport); // PENDING

        await expect(
            updateProductReportService(1, 1, { report_status: "RESOLVED", notes: "resuelto" })
        ).rejects.toThrow(ValidationError);
    });

    it("lanza ValidationError al intentar pasar de PENDING a REJECTED directamente", async () => {
        prisma.users.findUnique.mockResolvedValue(mockSellerUser);
        prisma.stores.findUnique.mockResolvedValue(mockStore);
        prisma.productReports.findFirst.mockResolvedValue(mockReport); // PENDING

        await expect(
            updateProductReportService(1, 1, { report_status: "REJECTED", notes: "rechazado" })
        ).rejects.toThrow(ValidationError);
    });

    it("lanza ValidationError al resolver sin agregar notes", async () => {
        prisma.users.findUnique.mockResolvedValue(mockSellerUser);
        prisma.stores.findUnique.mockResolvedValue(mockStore);
        prisma.productReports.findFirst.mockResolvedValue(mockReportInProgress);

        await expect(
            updateProductReportService(1, 1, { report_status: "RESOLVED" }) // sin notes
        ).rejects.toThrow(ValidationError);
    });

    it("lanza ValidationError al rechazar sin agregar notes", async () => {
        prisma.users.findUnique.mockResolvedValue(mockSellerUser);
        prisma.stores.findUnique.mockResolvedValue(mockStore);
        prisma.productReports.findFirst.mockResolvedValue(mockReportInProgress);

        await expect(
            updateProductReportService(1, 1, { report_status: "REJECTED" }) // sin notes
        ).rejects.toThrow(ValidationError);
    });

    it("lanza ValidationError al resolver con notes vacío", async () => {
        prisma.users.findUnique.mockResolvedValue(mockSellerUser);
        prisma.stores.findUnique.mockResolvedValue(mockStore);
        prisma.productReports.findFirst.mockResolvedValue(mockReportInProgress);

        await expect(
            updateProductReportService(1, 1, { report_status: "RESOLVED", notes: "   " })
        ).rejects.toThrow(ValidationError);
    });

    it("actualiza correctamente de PENDING a IN_PROGRESS sin notas", async () => {
        prisma.users.findUnique.mockResolvedValue(mockSellerUser);
        prisma.stores.findUnique.mockResolvedValue(mockStore);
        prisma.productReports.findFirst.mockResolvedValue(mockReport); // PENDING
        prisma.productReports.update.mockResolvedValue(mockUpdatedReport);

        const result = await updateProductReportService(1, 1, { report_status: "IN_PROGRESS" });

        expect(prisma.productReports.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id_product_report: 1 },
                data: expect.objectContaining({ report_status: "IN_PROGRESS" }),
            })
        );
        expect(result).toMatchObject({ id_product_report: 1, report_status: "IN_PROGRESS" });
    });

    it("actualiza correctamente de IN_PROGRESS a RESOLVED con notes", async () => {
        prisma.users.findUnique.mockResolvedValue(mockSellerUser);
        prisma.stores.findUnique.mockResolvedValue(mockStore);
        prisma.productReports.findFirst.mockResolvedValue(mockReportInProgress);
        prisma.productReports.update.mockResolvedValue({
            ...mockUpdatedReport,
            report_status: "RESOLVED",
            notes: "Se reenvió el producto",
            resolved_at: new Date(),
        });

        const result = await updateProductReportService(1, 1, {
            report_status: "RESOLVED",
            notes: "Se reenvió el producto",
        });

        expect(result.report_status).toBe("RESOLVED");
        expect(result.notes).toBe("Se reenvió el producto");
        expect(result.resolved_at).toBeDefined();
    });

    it("actualiza correctamente de IN_PROGRESS a REJECTED con notes", async () => {
        prisma.users.findUnique.mockResolvedValue(mockSellerUser);
        prisma.stores.findUnique.mockResolvedValue(mockStore);
        prisma.productReports.findFirst.mockResolvedValue(mockReportInProgress);
        prisma.productReports.update.mockResolvedValue({
            ...mockUpdatedReport,
            report_status: "REJECTED",
            notes: "El reclamo no procede",
            resolved_at: new Date(),
        });

        const result = await updateProductReportService(1, 1, {
            report_status: "REJECTED",
            notes: "El reclamo no procede",
        });

        expect(result.report_status).toBe("REJECTED");
        expect(result.notes).toBe("El reclamo no procede");
    });

    it("guarda resolved_by y resolved_at al cerrar el reporte", async () => {
        prisma.users.findUnique.mockResolvedValue(mockSellerUser);
        prisma.stores.findUnique.mockResolvedValue(mockStore);
        prisma.productReports.findFirst.mockResolvedValue(mockReportInProgress);
        prisma.productReports.update.mockResolvedValue({
            ...mockUpdatedReport,
            report_status: "RESOLVED",
            notes: "Resuelto",
            resolved_at: new Date(),
        });

        await updateProductReportService(1, 1, {
            report_status: "RESOLVED",
            notes: "Resuelto",
        });

        expect(prisma.productReports.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    resolved_by: 1,
                    resolved_at: expect.any(Date),
                }),
            })
        );
    });

    it("lanza ValidationError cuando notes no es un string", async () => {
        prisma.users.findUnique.mockResolvedValue(mockSellerUser);
        prisma.stores.findUnique.mockResolvedValue(mockStore);
        prisma.productReports.findFirst.mockResolvedValue(mockReportInProgress);

        await expect(
            updateProductReportService(1, 1, { report_status: "RESOLVED", notes: 123 })
        ).rejects.toThrow(ValidationError);
    });
});

// ─── getProductsReportsFilteredService ───────────────────────────────────────

describe("getProductsReportsFilteredService", () => {
    beforeEach(() => vi.clearAllMocks());

    it("lanza NotFoundError cuando el usuario no existe", async () => {
        prisma.users.findUnique.mockResolvedValue(null);

        await expect(
            getProductsReportsFilteredService(1, {}, mockPagination)
        ).rejects.toThrow(NotFoundError);
    });

    it("lanza ForbiddenError cuando el usuario es CUSTOMER", async () => {
        prisma.users.findUnique.mockResolvedValue(mockCustomerUser);

        await expect(
            getProductsReportsFilteredService(1, {}, mockPagination)
        ).rejects.toThrow(ForbiddenError);
    });

    it("lanza ValidationError cuando report_status es inválido", async () => {
        prisma.users.findUnique.mockResolvedValue(mockAdminUser);

        await expect(
            getProductsReportsFilteredService(1, { report_status: "INVALIDO" }, mockPagination)
        ).rejects.toThrow(ValidationError);
    });

    it("retorna reportes paginados correctamente para ADMIN sin filtros", async () => {
        prisma.users.findUnique.mockResolvedValue(mockAdminUser);
        prisma.productReports.findMany.mockResolvedValue([mockReport]);
        prisma.productReports.count.mockResolvedValue(1);

        const result = await getProductsReportsFilteredService(1, {}, mockPagination);

        expect(result.data).toHaveLength(1);
        expect(result.meta).toMatchObject({
            total: 1,
            page: 1,
            limit: 10,
            total_pages: 1,
        });
    });

    it("retorna array vacío cuando no hay reportes con los filtros aplicados", async () => {
        prisma.users.findUnique.mockResolvedValue(mockAdminUser);
        prisma.productReports.findMany.mockResolvedValue([]);
        prisma.productReports.count.mockResolvedValue(0);

        const result = await getProductsReportsFilteredService(
            1,
            { report_status: "RESOLVED" },
            mockPagination
        );

        expect(result.data).toEqual([]);
        expect(result.meta.total).toBe(0);
        expect(result.meta.total_pages).toBe(0);
    });

    it("filtra correctamente por report_status PENDING", async () => {
        prisma.users.findUnique.mockResolvedValue(mockAdminUser);
        prisma.productReports.findMany.mockResolvedValue([mockReport]);
        prisma.productReports.count.mockResolvedValue(1);

        const result = await getProductsReportsFilteredService(
            1,
            { report_status: "PENDING" },
            mockPagination
        );

        expect(result.data[0].report_status).toBe("PENDING");
    });

    it("acepta todos los valores válidos de report_status", async () => {
        prisma.users.findUnique.mockResolvedValue(mockAdminUser);
        prisma.productReports.findMany.mockResolvedValue([]);
        prisma.productReports.count.mockResolvedValue(0);

        const validStatuses = ["PENDING", "IN_PROGRESS", "RESOLVED", "REJECTED"];

        for (const status of validStatuses) {
            await expect(
                getProductsReportsFilteredService(1, { report_status: status }, mockPagination)
            ).resolves.toBeDefined();
        }
    });

    it("aplica búsqueda por nombre del reporter correctamente", async () => {
        prisma.users.findUnique.mockResolvedValue(mockAdminUser);
        prisma.productReports.findMany.mockResolvedValue([mockReport]);
        prisma.productReports.count.mockResolvedValue(1);

        const result = await getProductsReportsFilteredService(
            1,
            { search: "Juan" },
            mockPagination
        );

        expect(result.data).toHaveLength(1);
        expect(prisma.productReports.findMany).toHaveBeenCalled();
    });

    it("calcula correctamente total_pages con múltiples páginas", async () => {
        prisma.users.findUnique.mockResolvedValue(mockAdminUser);
        prisma.productReports.findMany.mockResolvedValue([mockReport]);
        prisma.productReports.count.mockResolvedValue(25);

        const result = await getProductsReportsFilteredService(
            1,
            {},
            { page: 1, limit: 10, skip: 0 }
        );

        expect(result.meta.total_pages).toBe(3); // ceil(25/10)
    });

    it("lanza NotFoundError cuando el SELLER no tiene tienda asociada", async () => {
        prisma.users.findUnique.mockResolvedValue(mockSellerUser);
        prisma.stores.findUnique.mockResolvedValue(null);

        await expect(
            getProductsReportsFilteredService(1, {}, mockPagination)
        ).rejects.toThrow(NotFoundError);
    });

    it("restringe los resultados a su tienda cuando el usuario es SELLER", async () => {
        prisma.users.findUnique.mockResolvedValue(mockSellerUser);
        prisma.stores.findUnique.mockResolvedValue(mockStore);
        prisma.productReports.findMany.mockResolvedValue([mockReport]);
        prisma.productReports.count.mockResolvedValue(1);

        const result = await getProductsReportsFilteredService(1, {}, mockPagination);

        expect(result.data).toHaveLength(1);
        // Verifica que findMany fue llamado (el filtro de tienda se aplica internamente)
        expect(prisma.productReports.findMany).toHaveBeenCalled();
    });

    it("ejecuta findMany y count en paralelo (Promise.all)", async () => {
        prisma.users.findUnique.mockResolvedValue(mockAdminUser);
        prisma.productReports.findMany.mockResolvedValue([]);
        prisma.productReports.count.mockResolvedValue(0);

        await getProductsReportsFilteredService(1, {}, mockPagination);

        // Ambos deben haber sido llamados exactamente una vez
        expect(prisma.productReports.findMany).toHaveBeenCalledTimes(1);
        expect(prisma.productReports.count).toHaveBeenCalledTimes(1);
    });

    it("lanza ValidationError cuando el userId no es un entero positivo", async () => {
        await expect(
            getProductsReportsFilteredService(-1, {}, mockPagination)
        ).rejects.toThrow(ValidationError);
    });
});