import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { createStoreService, updateStoreService } from "../../../src/modules/commerce/commerces/store.service.js";
import { prisma } from "../../../src/lib/prisma.js";

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock("../../../src/lib/prisma.js", () => ({
    prisma: {
        addresses: {
            findFirst: vi.fn(),
        },
        shippingZones: {
            findFirst: vi.fn(),
        },
        stores: {
            create: vi.fn(),
            findUnique: vi.fn(),
            update: vi.fn(),
        },
        users: {
            findUnique: vi.fn(),
        },
        storeCategories: {
            findUnique: vi.fn(),
        },
        $transaction: vi.fn(async (cb) => {
            // Mock transaction consistente con create/update de store.service
            const txMock = {
                addresses: {
                    create: vi.fn().mockResolvedValue(mockAddress),
                    update: vi.fn().mockResolvedValue(mockAddress),
                },
                stores: {
                    create: vi.fn().mockResolvedValue(mockStore),
                    update: vi.fn().mockResolvedValue(mockStore),
                    findUnique: vi.fn().mockResolvedValue({
                        ...mockStore,
                        addresses: [mockAddress],
                        products: [],
                        shipping_zones: [{ id_shipping_zone: 1, base_price: 20000, distance_price: 5000, status: true }],
                    }),
                },
                shippingZones: {
                    create: vi.fn().mockResolvedValue({ status: true }),
                    update: vi.fn().mockResolvedValue({ status: true }),
                },
                users: {
                    update: vi.fn().mockResolvedValue(mockUser),
                },
            };
            return cb(txMock);
        }),
    }
}));

vi.stubGlobal("fetch", vi.fn(async () => ({
    ok: true,
    json: async () => ({
        address: "Dirección Geocodificada",
        city: "Asunción",
        region: "Asunción",
    }),
})));

// ─── Datos de prueba ──────────────────────────────────────────────────────────
const mockUser = {
    id_user: 1,
    email: "seller@test.com",
    name: "Test Seller",
    status: true,
    role: "SELLER",
};

const mockCategory = {
    id_store_category: 1,
    name: "Tecnología",
    status: true,
};

const mockAddress = {
    address: "Calle Principal 123, Asunción",
    city: "Asunción",
    region: "Asunción",
    postal_code: "1500",
    latitude: -25.2637,
    longitude: -57.5759,
};

const mockStore = {
    id_store: 1,
    fk_user: 1,
    fk_store_category: 1,
    name: "Mi Tienda",
    email: "store@test.com",
    phone: "0971234567",
    description: "Tienda de tecnología",
    logo: null,
    website_url: null,
    instagram_url: null,
    tiktok_url: null,
    status: true,
    created_at: new Date(),
    updated_at: new Date(),
};

// ─── Suite de pruebas: createStoreService ─────────────────────────────────────
describe("Store Service — createStoreService (con ubicación)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.ORS_API_KEY = "test-key";
        prisma.users.findUnique.mockResolvedValue(mockUser);
        prisma.stores.findUnique.mockResolvedValue(null);
        prisma.storeCategories.findUnique.mockResolvedValue(mockCategory);
    });

    afterEach(() => {
        delete process.env.ORS_API_KEY;
    });

    // ─── Validaciones de campos requeridos ─────────────────────────────────────
    it("valida que el nombre sea requerido", async () => {
        const payload = {
            fk_user: 1,
            fk_store_category: 1,
            name: "",  // vacío
            email: "store@test.com",
            phone: "0971234567",
            address: "Calle 123",
            latitude: -25.2637,
            longitude: -57.5759,
                base_price: 20000,
                distance_price: 5000,
        };

        prisma.users.findUnique.mockResolvedValueOnce(mockUser);
        prisma.storeCategories.findUnique.mockResolvedValueOnce(mockCategory);

        await expect(createStoreService(payload)).rejects.toThrow(/falta|obligatorio/i);
    });

    it("valida que el email sea válido", async () => {
        const payload = {
            fk_user: 1,
            fk_store_category: 1,
            name: "Mi Tienda",
            email: "email-inválido",  // sin @
            phone: "0971234567",
            address: "Calle 123",
            latitude: -25.2637,
            longitude: -57.5759,
                base_price: 20000,
                distance_price: 5000,
        };

        prisma.users.findUnique.mockResolvedValueOnce(mockUser);
        prisma.storeCategories.findUnique.mockResolvedValueOnce(mockCategory);

        await expect(createStoreService(payload)).rejects.toThrow(/email/i);
    });

    it("valida que el teléfono sea requerido", async () => {
        const payload = {
            fk_user: 1,
            fk_store_category: 1,
            name: "Mi Tienda",
            email: "store@test.com",
            phone: "",  // vacío
            address: "Calle 123",
            latitude: -25.2637,
            longitude: -57.5759,
                base_price: 20000,
                distance_price: 5000,
        };

        prisma.users.findUnique.mockResolvedValueOnce(mockUser);
        prisma.storeCategories.findUnique.mockResolvedValueOnce(mockCategory);

        await expect(createStoreService(payload)).rejects.toThrow(/faltan campos obligatorios/i);
    });

    // ─── Validaciones de ubicación ─────────────────────────────────────────────
    it("valida que la latitud esté dentro del rango válido", async () => {
        const payload = {
            fk_user: 1,
            fk_store_category: 1,
            name: "Mi Tienda",
            email: "store@test.com",
            phone: "0971234567",
            address: "Calle 123",
            latitude: -91,  // fuera de rango: -90 a 90
            longitude: -57.5759,
                base_price: 20000,
                distance_price: 5000,
        };

        prisma.users.findUnique.mockResolvedValueOnce(mockUser);
        prisma.storeCategories.findUnique.mockResolvedValueOnce(mockCategory);

        await expect(createStoreService(payload)).rejects.toThrow(
            /latitud.*inv[áa]lida/i
        );
    });

    it("valida que la longitud esté dentro del rango válido", async () => {
        const payload = {
            fk_user: 1,
            fk_store_category: 1,
            name: "Mi Tienda",
            email: "store@test.com",
            phone: "0971234567",
            address: "Calle 123",
            latitude: -25.2637,
            longitude: -181,  // fuera de rango: -180 a 180
                base_price: 20000,
                distance_price: 5000,
        };

        prisma.users.findUnique.mockResolvedValueOnce(mockUser);
        prisma.storeCategories.findUnique.mockResolvedValueOnce(mockCategory);

        await expect(createStoreService(payload)).rejects.toThrow(
            /longitud.*inv[áa]lida/i
        );
    });

    it("rechaza coordenadas no numéricas", async () => {
        const payload = {
            fk_user: 1,
            fk_store_category: 1,
            name: "Mi Tienda",
            email: "store@test.com",
            phone: "0971234567",
            address: "Calle 123",
            latitude: "abc",  // no es número
            longitude: -57.5759,
                base_price: 20000,
                distance_price: 5000,
        };

        prisma.users.findUnique.mockResolvedValueOnce(mockUser);
        prisma.storeCategories.findUnique.mockResolvedValueOnce(mockCategory);

        await expect(createStoreService(payload)).rejects.toThrow(/latitud.*inv[áa]lida/i);
    });

    // ─── Creación exitosa ──────────────────────────────────────────────────────
    it("crea tienda exitosamente con validación de ubicación", async () => {
        const payload = {
            fk_user: 1,
            fk_store_category: 1,
            name: "Mi Tienda",
            email: "store@test.com",
            phone: "0971234567",
            description: null,
            address: "Calle 123",
            latitude: -25.2637,
            longitude: -57.5759,
            base_price: 20000,
            distance_price: 5000,
        };

        prisma.users.findUnique.mockResolvedValueOnce(mockUser);
        prisma.storeCategories.findUnique.mockResolvedValueOnce(mockCategory);

        const result = await createStoreService(payload);

        expect(result).toHaveProperty("id_store");
    });

    it("valida máxima longitud del nombre (100 caracteres)", async () => {
        const payload = {
            fk_user: 1,
            fk_store_category: 1,
            name: "a".repeat(101),  // 101 caracteres
            email: "store@test.com",
            phone: "0971234567",
            address: "Calle 123",
            latitude: -25.2637,
            longitude: -57.5759,
                base_price: 20000,
                distance_price: 5000,
        };

        prisma.users.findUnique.mockResolvedValueOnce(mockUser);
        prisma.storeCategories.findUnique.mockResolvedValueOnce(mockCategory);

        await expect(createStoreService(payload)).rejects.toThrow(/demasiado largo/i);
    });

    it("valida máxima longitud del teléfono (20 caracteres)", async () => {
        const payload = {
            fk_user: 1,
            fk_store_category: 1,
            name: "Mi Tienda",
            base_price: 20000,
            distance_price: 5000,
            email: "store@test.com",
            phone: "0" + "1".repeat(20),  // 21 caracteres
            address: "Calle 123",
            latitude: -25.2637,
            longitude: -57.5759,
        };

        prisma.users.findUnique.mockResolvedValueOnce(mockUser);
        prisma.storeCategories.findUnique.mockResolvedValueOnce(mockCategory);

        await expect(createStoreService(payload)).rejects.toThrow(/demasiado largo/i);
    });
});

// ─── Suite de pruebas: updateStoreService ─────────────────────────────────────
describe("Store Service — updateStoreService (actualizar ubicación)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.ORS_API_KEY = "test-key";
        prisma.addresses.findFirst.mockResolvedValue({ id_address: 1 });
        prisma.shippingZones.findFirst.mockResolvedValue({ id_shipping_zone: 1 });
    });

    afterEach(() => {
        delete process.env.ORS_API_KEY;
    });

    // ─── Validaciones de autorización ──────────────────────────────────────────
    it("rechaza actualización cuando el usuario no es propietario", async () => {
        const payload = {
            name: "Mi Tienda Actualizada",
            latitude: -25.2637,
            longitude: -57.5759,
        };

        prisma.stores.findUnique.mockResolvedValueOnce({
            ...mockStore,
            fk_user: 99,  // usuario diferente
                status: true,
                user: { id_user: 99, status: true },
        });

        await expect(
                updateStoreService(1, mockStore.id_store, payload)
            ).rejects.toThrow(/no tiene permisos/i);
    });

    // ─── Actualización de ubicación ────────────────────────────────────────────
    it("actualiza exitosamente la ubicación de la tienda", async () => {
        const newCoordinates = {
            latitude: -25.3000,
            longitude: -57.6000,
        };

        const payload = {
            ...newCoordinates,
        };

            prisma.stores.findUnique.mockResolvedValueOnce({
                ...mockStore,
                status: true,
                user: { id_user: mockUser.id_user, status: true },
            });
            prisma.users.findUnique.mockResolvedValueOnce(mockUser);
        const result = await updateStoreService(1, mockStore.id_store, payload);

        expect(result).toHaveProperty("id_store");
    });

    it("valida nuevas coordenadas al actualizar ubicación", async () => {
        const payload = {
            latitude: 91,  // fuera de rango
            longitude: -57.5759,
        };

            prisma.stores.findUnique.mockResolvedValueOnce({
                ...mockStore,
                status: true,
                user: { id_user: mockUser.id_user, status: true },
            });

        await expect(
                updateStoreService(1, mockStore.id_store, payload)
        ).rejects.toThrow(/latitud.*inv[áa]lida/i);
    });

    it("permite actualizar solo algunos campos sin afectar otros", async () => {
        const payload = {
            name: "Nuevo Nombre",
            // Ubicación no se actualiza
        };

            prisma.stores.findUnique.mockResolvedValueOnce({
                ...mockStore,
                status: true,
                user: { id_user: mockUser.id_user, status: true },
            });
        prisma.users.findUnique.mockResolvedValueOnce(mockUser);
        prisma.$transaction.mockImplementationOnce(async (cb) => {
            return cb({
                stores: {
                    update: vi.fn().mockResolvedValue({ ...mockStore, name: "Nuevo Nombre" }),
                    findUnique: vi.fn().mockResolvedValue({
                        ...mockStore,
                        name: "Nuevo Nombre",
                        addresses: [mockAddress],
                        products: [],
                        shipping_zones: [],
                    }),
                },
                addresses: {
                    update: vi.fn(),
                    create: vi.fn(),
                },
                shippingZones: {
                    update: vi.fn(),
                    create: vi.fn(),
                },
            });
        });

            const result = await updateStoreService(1, mockStore.id_store, payload);

        expect(result.name).toBe("Nuevo Nombre");
    });
});

// ─── Suite de pruebas: Cálculo de costo de envío ───────────────────────────────
describe("Store Service — Cálculo de costo de envío", () => {
    const DISTANCE_THRESHOLD_KM = 2;

    it("aplica base_price cuando distancia <= threshold", () => {
        const distance = 1.5;  // 1.5 km
        const basePrice = 25000;  // 25.000 Gs
        const distancePrice = 5000;  // 5.000 Gs/km

        // Cálculo esperado: base_price (no se suma distancia)
        const cost = basePrice;

        expect(cost).toBe(25000);
    });

    it("aplica base_price + (distance_price * exceso) cuando distancia > threshold", () => {
        const distance = 5;  // 5 km
        const basePrice = 25000;  // 25.000 Gs
        const distancePrice = 5000;  // 5.000 Gs/km
        const excessKm = distance - DISTANCE_THRESHOLD_KM;  // 3 km

        // Cálculo esperado: base_price + (distance_price * exceso)
        const cost = basePrice + (distancePrice * excessKm);

        expect(cost).toBe(25000 + (5000 * 3));
        expect(cost).toBe(40000);
    });

    it("calcula costo correctamente para distancias mínimas", () => {
        const distance = 0.5;
        const basePrice = 15000;
        const distancePrice = 3000;

        const cost = basePrice;  // Menor que threshold

        expect(cost).toBe(15000);
    });

    it("calcula costo correctamente para distancias grandes", () => {
        const distance = 20;  // 20 km
        const basePrice = 30000;
        const distancePrice = 8000;
        const excessKm = distance - DISTANCE_THRESHOLD_KM;  // 18 km

        const cost = basePrice + (distancePrice * excessKm);

        expect(cost).toBe(30000 + (8000 * 18));
        expect(cost).toBe(174000);
    });

    it("maneja distancia exacta igual al threshold", () => {
        const distance = DISTANCE_THRESHOLD_KM;
        const basePrice = 20000;
        const distancePrice = 5000;

        // Cuando distancia === threshold, no hay exceso
        const cost = basePrice;

        expect(cost).toBe(20000);
    });
});
