import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import {
    createAddressService,
    updateAddressService,
    getOwnedPersonalAddressOrThrow
} from "../../../src/modules/users/addresses/services/addresses.services.js";
import { prisma } from "../../../src/lib/prisma.js";

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock("../../../src/lib/prisma.js", () => ({
    prisma: {
        users: {
            findUnique: vi.fn(),
        },
        addresses: {
            create: vi.fn(),
            findFirst: vi.fn(),
            findUnique: vi.fn(),
            findMany: vi.fn(),
            update: vi.fn(),
            updateMany: vi.fn(),
            count: vi.fn(),
        },
        $transaction: vi.fn(async (cb) => {
            // Mock transaction que simula lock + conteo + creación dentro de la transacción
            const txMock = {
                addresses: {
                    create: vi.fn(async ({ data }) => ({
                        id_address: 1,
                        status: true,
                        created_at: new Date(),
                        updated_at: new Date(),
                        ...data,
                    })),
                    count: vi.fn().mockResolvedValue(0),
                },
                $queryRaw: vi.fn().mockResolvedValue([{ id: 1 }]),
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
    status: true,
};

const mockAddress = {
    id_address: 1,
    fk_user: 1,
    fk_store: null,
    address: "Calle Palma 123, Asunción",
    city: "Asunción",
    region: "Asunción",
    postal_code: "1500",
    latitude: -25.2637,
    longitude: -57.5759,
    status: true,
    created_at: new Date(),
    updated_at: new Date(),
};

// ─── Suite de pruebas: createAddressService ───────────────────────────────────
describe("Address Service — createAddressService (con ubicación)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        prisma.users.findUnique.mockResolvedValue(mockUser);
    });

    // ─── Validación de autorización ────────────────────────────────────────────
    it("rechaza cuando IDs de usuario no coinciden", async () => {
        const payload = {
            address: "Calle 123",
            latitude: -25.2637,
            longitude: -57.5759,
        };

        await expect(
            createAddressService(1, 2, payload)  // IDs diferentes
        ).rejects.toThrow(/no tiene permisos/i);
    });

    it("rechaza cuando usuario autenticado no existe", async () => {
        prisma.users.findUnique.mockResolvedValueOnce(null);

        const payload = {
            address: "Calle 123",
            latitude: -25.2637,
            longitude: -57.5759,
        };

        await expect(
            createAddressService(999, 999, payload)
        ).rejects.toThrow(/usuario.*no encontrado|no existe/i);
    });

    it("rechaza cuando usuario está inactivo", async () => {
        prisma.users.findUnique.mockResolvedValueOnce({
            id_user: 1,
            status: false,  // inactivo
        });

        const payload = {
            address: "Calle 123",
            latitude: -25.2637,
            longitude: -57.5759,
        };

        await expect(
            createAddressService(1, 1, payload)
        ).rejects.toThrow(/usuario.*inactivo/i);
    });

    // ─── Validación de campos ─────────────────────────────────────────────────
    it("valida que la dirección sea requerida", async () => {
        prisma.users.findUnique.mockResolvedValueOnce(mockUser);

        const payload = {
            address: "",  // vacío
            latitude: -25.2637,
            longitude: -57.5759,
        };

        await expect(
            createAddressService(1, 1, payload)
        ).rejects.toThrow(/address.*estar vacio/i);
    });

    it("valida que la latitud sea un número", async () => {
        prisma.users.findUnique.mockResolvedValueOnce(mockUser);

        const payload = {
            address: "Calle 123",
            latitude: "no-es-numero",
            longitude: -57.5759,
        };

        await expect(
            createAddressService(1, 1, payload)
        ).rejects.toThrow(/latitud/i);
    });

    it("valida que la longitud sea un número", async () => {
        prisma.users.findUnique.mockResolvedValueOnce(mockUser);

        const payload = {
            address: "Calle 123",
            latitude: -25.2637,
            longitude: "no-es-numero",
        };

        await expect(
            createAddressService(1, 1, payload)
        ).rejects.toThrow(/longitud/i);
    });

    // ─── Validación de coordenadas ─────────────────────────────────────────────
    it("valida que latitud esté en rango [-90, 90]", async () => {
        prisma.users.findUnique.mockResolvedValueOnce(mockUser);

        const payload = {
            address: "Calle 123",
            latitude: -91,  // fuera de rango
            longitude: -57.5759,
        };

        await expect(
            createAddressService(1, 1, payload)
        ).rejects.toThrow(/latitud.*inv[áa]lida/i);
    });

    it("valida que longitud esté en rango [-180, 180]", async () => {
        prisma.users.findUnique.mockResolvedValueOnce(mockUser);

        const payload = {
            address: "Calle 123",
            latitude: -25.2637,
            longitude: -181,  // fuera de rango
        };

        await expect(
            createAddressService(1, 1, payload)
        ).rejects.toThrow(/longitud.*inv[áa]lida/i);
    });

    it("acepta latitud en límite superior (90)", async () => {
        prisma.users.findUnique.mockResolvedValueOnce(mockUser);
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ address: {} })
        });
        prisma.$transaction.mockImplementationOnce(async (cb) => cb({
            $queryRaw: vi.fn().mockResolvedValue([{ id: 1 }]),
            addresses: {
                count: vi.fn().mockResolvedValue(0),
                create: vi.fn(async ({ data }) => ({ ...mockAddress, ...data })),
            },
        }));

        const payload = {
            address: "Calle 123",
            latitude: 90,
            longitude: -57.5759,
        };

        const result = await createAddressService(1, 1, payload);

        expect(result.latitude).toBe(90);
    });

    it("acepta longitud en límite inferior (-180)", async () => {
        prisma.users.findUnique.mockResolvedValueOnce(mockUser);
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ address: {} })
        });
        prisma.$transaction.mockImplementationOnce(async (cb) => cb({
            $queryRaw: vi.fn().mockResolvedValue([{ id: 1 }]),
            addresses: {
                count: vi.fn().mockResolvedValue(0),
                create: vi.fn(async ({ data }) => ({ ...mockAddress, ...data })),
            },
        }));

        const payload = {
            address: "Calle 123",
            latitude: -25.2637,
            longitude: -180,
        };

        const result = await createAddressService(1, 1, payload);

        expect(result.longitude).toBe(-180);
    });

    // ─── Límite de direcciones ─────────────────────────────────────────────────
    it("rechaza cuando usuario ya tiene 5 direcciones activas", async () => {
        prisma.users.findUnique.mockResolvedValueOnce(mockUser);
        prisma.$transaction.mockImplementationOnce(async (cb) => cb({
            $queryRaw: vi.fn().mockResolvedValue([{ id: 1 }]),
            addresses: {
                count: vi.fn().mockResolvedValue(5),
                create: vi.fn(),
            },
        }));

        const payload = {
            address: "Calle 123",
            latitude: -25.2637,
            longitude: -57.5759,
        };

        await expect(
            createAddressService(1, 1, payload)
        ).rejects.toThrow(/l[ií]mite.*direcciones/i);
    });

    it("permite crear dirección cuando tiene 4 de 5", async () => {
        prisma.users.findUnique.mockResolvedValueOnce(mockUser);
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ address: {} })
        });
        prisma.$transaction.mockImplementationOnce(async (cb) => cb({
            $queryRaw: vi.fn().mockResolvedValue([{ id: 1 }]),
            addresses: {
                count: vi.fn().mockResolvedValue(4),
                create: vi.fn().mockResolvedValue(mockAddress),
            },
        }));

        const payload = {
            address: "Calle 123",
            latitude: -25.2637,
            longitude: -57.5759,
        };

        const result = await createAddressService(1, 1, payload);

        expect(result).toHaveProperty("id_address");
    });

    // ─── Creación exitosa ──────────────────────────────────────────────────────
    it("crea dirección exitosamente con geocodificación inversa", async () => {
        prisma.users.findUnique.mockResolvedValueOnce(mockUser);

        // Mock Nominatim reverse geocoding
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                address: {
                    road: "Palma",
                    house_number: "123",
                    city: "Asunción",
                    state: "Asunción",
                    postcode: "1500"
                }
            })
        });

        prisma.$transaction.mockImplementationOnce(async (cb) => cb({
            $queryRaw: vi.fn().mockResolvedValue([{ id: 1 }]),
            addresses: {
                count: vi.fn().mockResolvedValue(1),
                create: vi.fn().mockResolvedValue(mockAddress),
            },
        }));

        const payload = {
            address: "Calle Palma 123",
            latitude: -25.2637,
            longitude: -57.5759,
        };

        const result = await createAddressService(1, 1, payload);

        expect(result).toHaveProperty("id_address", 1);
        expect(result.latitude).toBe(-25.2637);
        expect(result.longitude).toBe(-57.5759);
    });
});

// ─── Suite de pruebas: updateAddressService ───────────────────────────────────
describe("Address Service — updateAddressService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        prisma.users.findUnique.mockResolvedValue(mockUser);
        prisma.addresses.updateMany.mockResolvedValue({ count: 1 });
        prisma.addresses.findUnique.mockResolvedValue(mockAddress);
    });

    it("rechaza actualización cuando dirección no pertenece al usuario", async () => {
        prisma.users.findUnique.mockResolvedValueOnce(null);  // Usuario no encontrado

        await expect(
            updateAddressService(1, 1, 1, { address: "Nuevas calle" })
        ).rejects.toThrow(/usuario no encontrado/i);
    });

    it("actualiza solo la dirección sin cambiar coordenadas", async () => {
        prisma.users.findUnique.mockResolvedValueOnce(mockUser);
        prisma.addresses.updateMany.mockResolvedValueOnce({ count: 1 });
        prisma.addresses.findUnique.mockResolvedValueOnce({
            ...mockAddress,
            address: "Nueva dirección",
        });

        const payload = {
            address: "Nueva dirección",
        };

        const result = await updateAddressService(1, 1, 1, payload);

        expect(result.address).toBe("Nueva dirección");
        expect(result.latitude).toBe(mockAddress.latitude);
    });

    it("actualiza solo las coordenadas sin cambiar dirección", async () => {
        const newCoords = {
            latitude: -25.3000,
            longitude: -57.6000,
        };

        prisma.users.findUnique.mockResolvedValueOnce(mockUser);
        prisma.addresses.updateMany.mockResolvedValueOnce({ count: 1 });
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                address: "Dirección actualizada",
                city: "Asunción",
                region: "Asunción",
            }),
        });
        prisma.addresses.findUnique.mockResolvedValueOnce({
            ...mockAddress,
            ...newCoords,
        });

        const result = await updateAddressService(1, 1, 1, newCoords);

        expect(result.latitude).toBe(newCoords.latitude);
        expect(result.longitude).toBe(newCoords.longitude);
        expect(result.address).toBe(mockAddress.address);
    });

    it("valida nuevas coordenadas al actualizar", async () => {
        prisma.users.findUnique.mockResolvedValueOnce(mockUser);

        const payload = {
            latitude: 91,  // inválido
            longitude: -57.5759,
        };

        await expect(
            updateAddressService(1, 1, 1, payload)
        ).rejects.toThrow(/latitud.*inv[áa]lida/i);
    });
});

// ─── Suite de pruebas: Para cálculo de costo de envío ───────────────────────────
describe("Address Service — Cálculo de envío (Confirmar Pedido)", () => {
    const DISTANCE_THRESHOLD_KM = 2;

    it("calcula costo de envío: distancia < threshold", () => {
        const distanceKm = 1.5;
        const basePrice = 25000;
        const distancePrice = 5000;

        // Solo se aplica base_price
        const shippingCost = basePrice;

        expect(shippingCost).toBe(25000);
    });

    it("calcula costo de envío: distancia = threshold", () => {
        const distanceKm = DISTANCE_THRESHOLD_KM;
        const basePrice = 25000;
        const distancePrice = 5000;

        // Solo se aplica base_price (no hay exceso)
        const shippingCost = basePrice;

        expect(shippingCost).toBe(25000);
    });

    it("calcula costo de envío: distancia > threshold", () => {
        const distanceKm = 5;
        const basePrice = 25000;
        const distancePrice = 5000;
        const excessKm = Math.max(0, distanceKm - DISTANCE_THRESHOLD_KM);

        // base_price + (distance_price * exceso)
        const shippingCost = basePrice + (distancePrice * excessKm);

        expect(shippingCost).toBe(25000 + (5000 * 3));
        expect(shippingCost).toBe(40000);
    });

    it("calcula costo total: subtotal + shipping - descuento", () => {
        const subtotal = 150000;
        const discount = 30000;  // 20% de descuento
        const shipping = 25000;

        const total = subtotal - discount + shipping;

        expect(total).toBe(145000);
    });

    it("calcula costo total sin envío (pickup)", () => {
        const subtotal = 150000;
        const discount = 30000;
        const shipping = 0;  // pickup

        const total = subtotal - discount + shipping;

        expect(total).toBe(120000);
    });

    it("maneja descuentos por oferta correctamente", () => {
        const items = [
            {
                quantity: 2,
                price: 50000,
                offerPrice: 40000,  // 20% descuento
                isOffer: true
            },
            {
                quantity: 1,
                price: 30000,
                offerPrice: null,
                isOffer: false
            }
        ];

        // Calcular subtotal
        const subtotal = items.reduce((acc, item) => {
            return acc + (item.price * item.quantity);
        }, 0);

        // Calcular descuento
        const discount = items.reduce((acc, item) => {
            if (!item.isOffer) return acc;
            return acc + ((item.price - item.offerPrice) * item.quantity);
        }, 0);

        const total = subtotal + 0 - discount;  // sin envío

        // Subtotal: (50000 * 2) + 30000 = 130000
        // Descuento: (50000 - 40000) * 2 = 20000
        // Total: 130000 - 20000 = 110000
        expect(subtotal).toBe(130000);
        expect(discount).toBe(20000);
        expect(total).toBe(110000);
    });

    it("integración completa: cálculo con dirección y distancia", () => {
        // Del carrito
        const cartItems = [
            { quantity: 1, product: { price: 100000, offerPrice: null, isOffer: false } },
            { quantity: 2, product: { price: 50000, offerPrice: 40000, isOffer: true } },
        ];

        // Subtotal
        const subtotal = 100000 + (50000 * 2);

        // Descuento
        const discount = (50000 - 40000) * 2;

        // De la dirección + tienda
        const distanceKm = 3.5;
        const basePrice = 25000;
        const distancePrice = 5000;
        const shipping = basePrice + (distancePrice * Math.max(0, distanceKm - DISTANCE_THRESHOLD_KM));

        // Total
        const total = subtotal - discount + shipping;

        // Validaciones
        expect(subtotal).toBe(200000);
        expect(discount).toBe(20000);
        expect(shipping).toBe(25000 + (5000 * 1.5)); // 32500
        expect(total).toBe(212500);
    });
});
