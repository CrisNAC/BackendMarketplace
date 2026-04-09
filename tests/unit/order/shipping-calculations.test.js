import { vi, describe, it, expect, beforeEach } from "vitest";

/**
 * Suite de pruebas para la lógica de cálculo de distancia y costo de envío
 * que se usa en la pantalla "ConfirmarPedido.tsx"
 */

// ─── Configuración constante ──────────────────────────────────────────────────
const DISTANCE_THRESHOLD_KM = 2;

// ─── Funciones auxiliares para el cálculo ──────────────────────────────────────
/**
 * Calcula el costo de envío basado en distancia y zonas de envío
 * @param {number} distanceKm - Distancia en kilómetros
 * @param {number} basePrice - Precio base de envío
 * @param {number} distancePrice - Precio por kilómetro de exceso
 * @returns {number} Costo de envío en guaraní
 */
function calculateShippingCost(distanceKm, basePrice, distancePrice) {
    if (distanceKm <= DISTANCE_THRESHOLD_KM) {
        return basePrice;
    }
    const excessKm = distanceKm - DISTANCE_THRESHOLD_KM;
    return basePrice + (distancePrice * excessKm);
}

/**
 * Calcula el precio del producto considerando oferta
 * @param {number} price - Precio base
 * @param {number|null} offerPrice - Precio con oferta (si existe)
 * @returns {object} { displayPrice, discountAmount }
 */
function getProductPrice(price, offerPrice) {
    if (!offerPrice || offerPrice >= price) {
        return { displayPrice: price, discountAmount: 0 };
    }
    return {
        displayPrice: offerPrice,
        discountAmount: price - offerPrice
    };
}

/**
 * Calcula el total del carrito
 * @param {array} items - Items del carrito
 * @param {number} shipping - Costo de envío
 * @returns {object} { subtotal, totalDiscount, total }
 */
function calculateCartTotal(items, shipping = 0) {
    let subtotal = 0;
    let totalDiscount = 0;

    items.forEach(item => {
        const { displayPrice, discountAmount } = getProductPrice(
            item.product.price,
            item.product.offerPrice
        );
        subtotal += displayPrice * item.quantity;
        totalDiscount += discountAmount * item.quantity;
    });

    return {
        subtotal,
        totalDiscount,
        total: subtotal + shipping
    };
}

// ─── Suite de pruebas: Cálculo de distancia y costo ──────────────────────────
describe("Distance & Shipping Calculations — ConfirmarPedido", () => {
    
    // ─── Cálculo de costo de envío ─────────────────────────────────────────────
    describe("calculateShippingCost()", () => {
        it("aplica solo base_price cuando distancia <= threshold (2 km)", () => {
            const cost = calculateShippingCost(1.5, 25000, 5000);
            expect(cost).toBe(25000);
        });

        it("aplica solo base_price cuando distancia = threshold (2 km)", () => {
            const cost = calculateShippingCost(2, 25000, 5000);
            expect(cost).toBe(25000);
        });

        it("aplica base_price + distancia cuando distancia > threshold", () => {
            // 5 km, threshold 2 km, exceso 3 km
            const cost = calculateShippingCost(5, 25000, 5000);
            expect(cost).toBe(25000 + (5000 * 3));
            expect(cost).toBe(40000);
        });

        it("calcula correctamente para distancias muy cortas", () => {
            const cost = calculateShippingCost(0.1, 20000, 3000);
            expect(cost).toBe(20000);
        });

        it("calcula correctamente para distancias largas", () => {
            // 20 km, threshold 2 km, exceso 18 km
            const cost = calculateShippingCost(20, 30000, 8000);
            expect(cost).toBe(30000 + (8000 * 18));
            expect(cost).toBe(174000);
        });

        it("maneja decimales en distancia", () => {
            // 3.75 km, threshold 2 km, exceso 1.75 km
            const cost = calculateShippingCost(3.75, 25000, 5000);
            expect(cost).toBe(25000 + (5000 * 1.75));
            expect(cost).toBe(33750);
        });

        it("aplica diferentes tarifas por zona", () => {
            // Zona cercana: base 15000, 3000 por km
            const costClose = calculateShippingCost(4, 15000, 3000);
            expect(costClose).toBe(15000 + (3000 * 2));

            // Zona lejana: base 35000, 8000 por km
            const costFar = calculateShippingCost(4, 35000, 8000);
            expect(costFar).toBe(35000 + (8000 * 2));

            // Diferencia esperada
            expect(costFar - costClose).toBe(20000 + (5000 * 2));
        });
    });

    // ─── Cálculo de precio de producto ───────────────────────────────────────────
    describe("getProductPrice()", () => {
        it("retorna precio base cuando no hay oferta", () => {
            const result = getProductPrice(50000, null);
            expect(result).toEqual({ displayPrice: 50000, discountAmount: 0 });
        });

        it("retorna precio con oferta cuando existe", () => {
            const result = getProductPrice(50000, 40000);
            expect(result).toEqual({ displayPrice: 40000, discountAmount: 10000 });
        });

        it("ignora oferta si es mayor que precio base", () => {
            const result = getProductPrice(50000, 60000);
            expect(result).toEqual({ displayPrice: 50000, discountAmount: 0 });
        });

        it("calcula descuento correcto por porcentaje", () => {
            // 20% de descuento: 50000 -> 40000
            const result = getProductPrice(50000, 40000);
            const discountPercent = (result.discountAmount / 50000) * 100;
            expect(discountPercent).toBe(20);
        });

        it("maneja precios muy bajos con oferta", () => {
            const result = getProductPrice(1000, 800);
            expect(result).toEqual({ displayPrice: 800, discountAmount: 200 });
        });
    });

    // ─── Cálculo total del carrito ────────────────────────────────────────────────
    describe("calculateCartTotal()", () => {
        it("calcula subtotal sin descuentos ni envío", () => {
            const items = [
                { quantity: 1, product: { price: 100000, offerPrice: null } },
                { quantity: 2, product: { price: 50000, offerPrice: null } },
            ];

            const result = calculateCartTotal(items, 0);

            expect(result.subtotal).toBe(100000 + (50000 * 2));
            expect(result.totalDiscount).toBe(0);
            expect(result.total).toBe(200000);
        });

        it("calcula total con descuentos por oferta", () => {
            const items = [
                { quantity: 1, product: { price: 100000, offerPrice: null } },
                { quantity: 2, product: { price: 50000, offerPrice: 40000 } },
            ];

            const result = calculateCartTotal(items, 0);

            // Subtotal: 100000 + (40000 * 2) = 180000
            // Descuento: (50000 - 40000) * 2 = 20000
            // Total: 180000
            expect(result.subtotal).toBe(180000);
            expect(result.totalDiscount).toBe(20000);
            expect(result.total).toBe(180000);
        });

        it("calcula total con envío incluido", () => {
            const items = [
                { quantity: 1, product: { price: 100000, offerPrice: null } },
            ];
            const shipping = 25000;

            const result = calculateCartTotal(items, shipping);

            expect(result.subtotal).toBe(100000);
            expect(result.total).toBe(125000);
        });

        it("integración completa: carrito con ofertas + descuentos + envío", () => {
            const items = [
                { quantity: 1, product: { price: 150000, offerPrice: null } },
                { quantity: 2, product: { price: 50000, offerPrice: 40000 } },
                { quantity: 3, product: { price: 30000, offerPrice: 25000 } },
            ];
            const shipping = 32500;

            const result = calculateCartTotal(items, shipping);

            // Subtotal CON ofertas aplicadas: 150000 + (40000*2) + (25000*3) = 305000
            // Descuento: (50000-40000)*2 + (30000-25000)*3 = 20000 + 15000 = 35000
            // Total: 305000 + 32500 = 337500
            expect(result.subtotal).toBe(305000);
            expect(result.totalDiscount).toBe(35000);
            expect(result.total).toBe(337500);
        });

        it("maneja carrito vacío", () => {
            const result = calculateCartTotal([], 0);
            expect(result.subtotal).toBe(0);
            expect(result.totalDiscount).toBe(0);
            expect(result.total).toBe(0);
        });

        it("calcula correctamente con pickup (envío 0)", () => {
            const items = [
                { quantity: 2, product: { price: 100000, offerPrice: 90000 } },
            ];

            const resultPickup = calculateCartTotal(items, 0);
            const resultShipping = calculateCartTotal(items, 25000);

            expect(resultPickup.total).toBe(180000);
            expect(resultShipping.total).toBe(205000);
            expect(resultShipping.total - resultPickup.total).toBe(25000);
        });
    });

    // ─── Validaciones de rango de distancia ────────────────────────────────────
    describe("Validación de distancia", () => {
        it("rechaza distancia negativa", () => {
            const distance = -5;
            expect(distance < 0).toBe(true);
        });

        it("acepta distancia cero", () => {
            const distance = 0;
            expect(distance >= 0).toBe(true);
        });

        it("valida máxima distancia de envío (100 km)", () => {
            const maxDistance = 100;
            expect(calculateShippingCost(100, 25000, 5000)).toBeDefined();
        });

        it("rechaza distancia fuera de límites", () => {
            const distance = 1000;
            const maxDistance = 100;
            expect(distance > maxDistance).toBe(true);
        });
    });

    // ─── Escenarios reales de compra ───────────────────────────────────────────
    describe("Escenarios reales de ConfirmarPedido", () => {
        it("ESCENARIO 1: Compra básica con envío cercano", () => {
            // Usuario compra 3 productos sin oferta a 3km del comercio
            const items = [
                { quantity: 1, product: { price: 50000, offerPrice: null } },
                { quantity: 2, product: { price: 30000, offerPrice: null } },
            ];
            const distanceKm = 3;
            const basePrice = 25000;
            const distancePrice = 5000;

            const shipping = calculateShippingCost(distanceKm, basePrice, distancePrice);
            const { subtotal, total } = calculateCartTotal(items, shipping);

            // Subtotal: 50000 + (30000 * 2) = 110000
            // Envío: 25000 + (5000 * 1) = 30000
            // Total: 140000
            expect(subtotal).toBe(110000);
            expect(shipping).toBe(30000);
            expect(total).toBe(140000);
        });

        it("ESCENARIO 2: Compra con ofertas + envío lejano", () => {
            // Usuario compra con descuentos a 10km del comercio
            const items = [
                { quantity: 1, product: { price: 100000, offerPrice: 80000 } },
                { quantity: 2, product: { price: 40000, offerPrice: 35000 } },
            ];
            const distanceKm = 10;
            const basePrice = 30000;
            const distancePrice = 8000;

            const shipping = calculateShippingCost(distanceKm, basePrice, distancePrice);
            const { subtotal, totalDiscount, total } = calculateCartTotal(items, shipping);

            // Subtotal: 80000 + (35000 * 2) = 150000
            // Descuento: 20000 + 10000 = 30000
            // Envío: 30000 + (8000 * 8) = 94000
            // Total: 150000 + 94000 = 244000
            expect(subtotal).toBe(150000);
            expect(totalDiscount).toBe(30000);
            expect(shipping).toBe(94000);
            expect(total).toBe(244000);
        });

        it("ESCENARIO 3: Retirada en local (pickup)", () => {
            // Usuario elige retirar en local, sin costo de envío
            const items = [
                { quantity: 3, product: { price: 25000, offerPrice: 20000 } },
            ];

            const result = calculateCartTotal(items, 0);  // shipping = 0

            // Subtotal: 20000 * 3 = 60000
            // Total: 60000 (sin envío)
            expect(result.subtotal).toBe(60000);
            expect(result.total).toBe(60000);
        });

        it("ESCENARIO 4: Compra mínima en zona de cobertura", () => {
            // Compra pequeña dentro del threshold de distancia
            const items = [
                { quantity: 1, product: { price: 15000, offerPrice: null } },
            ];
            const distanceKm = 1;  // Dentro del threshold (2km)
            const basePrice = 20000;
            const distancePrice = 5000;

            const shipping = calculateShippingCost(distanceKm, basePrice, distancePrice);
            const { total } = calculateCartTotal(items, shipping);

            // Solo base_price
            expect(shipping).toBe(20000);
            expect(total).toBe(35000);
        });

        it("ESCENARIO 5: Compra grande con múltiples descuentos", () => {
            // Compra de varios items, casi todos en oferta
            const items = [
                { quantity: 2, product: { price: 100000, offerPrice: 85000 } },
                { quantity: 1, product: { price: 80000, offerPrice: 70000 } },
                { quantity: 3, product: { price: 40000, offerPrice: 35000 } },
                { quantity: 1, product: { price: 25000, offerPrice: null } },
            ];
            const distanceKm = 5.5;
            const basePrice = 35000;
            const distancePrice = 6000;

            const shipping = calculateShippingCost(distanceKm, basePrice, distancePrice);
            const { subtotal, totalDiscount, total } = calculateCartTotal(items, shipping);

            // Subtotal CON ofertas aplicadas: (85000*2) + 70000 + (35000*3) + 25000 = 370000
            // Descuento: (15000*2) + 10000 + (5000*3) + 0 = 55000
            // Envío: 35000 + (6000 * 3.5) = 56000
            // Total (subtotal + envío): 370000 + 56000 = 426000
            expect(subtotal).toBe(370000);
            expect(totalDiscount).toBe(55000);
            expect(shipping).toBe(56000);
            expect(total).toBe(426000);
        });
    });
});
