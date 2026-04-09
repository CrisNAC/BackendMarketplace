import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { getDistance } from "../../../src/modules/global/distances/controllers/distance.controller.js";

// ─── Mock de fetch global ──────────────────────────────────────────────────────
global.fetch = vi.fn();

// ─── Datos de prueba ──────────────────────────────────────────────────────────
const mockRequest = (body) => ({
    body,
});

const mockResponse = () => {
    const res = {
        status: vi.fn(() => res),
        json: vi.fn(() => res),
    };
    res.json.mockReturnValue(res);
    return res;
};

const mockNext = vi.fn();

// ─── Suite de pruebas: POST /api/distances ────────────────────────────────────
describe("Distance Controller — POST /api/distances", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch.mockClear();
        process.env.ORS_API_KEY = "test-api-key";
    });

    afterEach(() => {
        delete process.env.ORS_API_KEY;
    });

    // ─── Validación de entrada ────────────────────────────────────────────────
    it("devuelve 400 cuando no se envían puntos", async () => {
        const req = mockRequest({});
        const res = mockResponse();

        await getDistance(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                error: expect.stringMatching(/al menos 2 puntos/i)
            })
        );
    });

    it("devuelve 400 cuando se envían menos de 2 puntos", async () => {
        const req = mockRequest({
            points: [[56.05, -107.45]]
        });
        const res = mockResponse();

        await getDistance(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                error: expect.stringMatching(/al menos 2 puntos/i)
            })
        );
    });

    it("devuelve 500 cuando ORS_API_KEY no está configurada", async () => {
        delete process.env.ORS_API_KEY;
        const req = mockRequest({
            points: [[56.05, -107.45], [57.05, -108.45]]
        });
        const res = mockResponse();

        await getDistance(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                error: expect.stringMatching(/geolocalización no disponible/i)
            })
        );
    });

    // ─── Cálculos correctos ────────────────────────────────────────────────────
    it("calcula distancia correctamente con 2 puntos", async () => {
        const points = [
            [-27.3340, -55.8655],
            [-27.4500, -55.9500]
        ];

        // Mock ORS API response
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                routes: [{
                    summary: {
                        distance: 15234.5  // metros
                    }
                }]
            })
        });

        const req = mockRequest({ points });
        const res = mockResponse();

        await getDistance(req, res, mockNext);

        expect(res.json).toHaveBeenCalledWith({
            distance_meters: 15234.5,
            distance_km: 15.23
        });
    });

    it("calcula distancia correctamente con múltiples puntos", async () => {
        const points = [
            [-27.3340, -55.8655],
            [-27.4000, -55.9000],
            [-27.4500, -55.9500]
        ];

        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                routes: [{
                    summary: {
                        distance: 25000  // metros
                    }
                }]
            })
        });

        const req = mockRequest({ points });
        const res = mockResponse();

        await getDistance(req, res, mockNext);

        expect(res.json).toHaveBeenCalledWith({
            distance_meters: 25000,
            distance_km: 25
        });
    });

    it("redondea correctamente la distancia en km", async () => {
        const points = [
            [-27.3340, -55.8655],
            [-27.4500, -55.9500]
        ];

        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                routes: [{
                    summary: {
                        distance: 12345.6789
                    }
                }]
            })
        });

        const req = mockRequest({ points });
        const res = mockResponse();

        await getDistance(req, res, mockNext);

        expect(res.json).toHaveBeenCalledWith({
            distance_meters: 12345.6789,
            distance_km: 12.35  // redondeado a 2 decimales
        });
    });

    // ─── Errores de ORS API ────────────────────────────────────────────────────
    it("devuelve error cuando ORS API retorna 400", async () => {
        const points = [
            [-27.3340, -55.8655],
            [-27.4500, -55.9500]
        ];

        global.fetch.mockResolvedValueOnce({
            ok: false,
            status: 400,
            json: async () => ({
                error: {
                    message: "Invalid coordinates"
                }
            })
        });

        const req = mockRequest({ points });
        const res = mockResponse();

        await getDistance(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                error: expect.stringMatching(/Invalid coordinates/i)
            })
        );
    });

    it("devuelve error cuando ORS API retorna 500", async () => {
        const points = [
            [-27.3340, -55.8655],
            [-27.4500, -55.9500]
        ];

        global.fetch.mockResolvedValueOnce({
            ok: false,
            status: 503,
            json: async () => ({
                error: { message: "Service unavailable" }
            })
        });

        const req = mockRequest({ points });
        const res = mockResponse();

        await getDistance(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(502);
    });

    it("maneja error cuando ORS API no retorna JSON válido", async () => {
        const points = [
            [-27.3340, -55.8655],
            [-27.4500, -55.9500]
        ];

        global.fetch.mockResolvedValueOnce({
            ok: false,
            status: 500,
            json: async () => {
                throw new Error("Invalid JSON");
            }
        });

        const req = mockRequest({ points });
        const res = mockResponse();

        await getDistance(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(502);
    });

    it("devuelve 500 cuando distance no está en response", async () => {
        const points = [
            [-27.3340, -55.8655],
            [-27.4500, -55.9500]
        ];

        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                routes: [{}]  // sin summary.distance
            })
        });

        const req = mockRequest({ points });
        const res = mockResponse();

        await getDistance(req, res, mockNext);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                error: expect.stringMatching(/no se pudo calcular/i)
            })
        );
    });

    // ─── Manejo de excepciones ────────────────────────────────────────────────
    it("pasa errores no controlados al middlewareErrorHandler", async () => {
        const error = new Error("Network error");
        global.fetch.mockRejectedValueOnce(error);

        const req = mockRequest({
            points: [[56.05, -107.45], [57.05, -108.45]]
        });
        const res = mockResponse();

        await getDistance(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith(error);
    });

    // ─── Validación de request a ORS API ───────────────────────────────────────
    it("envía coordinates correctamente a ORS API", async () => {
        const points = [
            [-55.8655, -27.3340],  // [lng, lat]
            [-55.9500, -27.4500]
        ];

        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                routes: [{
                    summary: { distance: 15000 }
                }]
            })
        });

        const req = mockRequest({ points });
        const res = mockResponse();

        await getDistance(req, res, mockNext);

        expect(global.fetch).toHaveBeenCalledWith(
            "https://api.openrouteservice.org/v2/directions/driving-car",
            expect.objectContaining({
                method: "POST",
                headers: expect.objectContaining({
                    "Authorization": "test-api-key",
                    "Content-Type": "application/json"
                }),
                body: JSON.stringify({
                    coordinates: points
                })
            })
        );
    });
});
