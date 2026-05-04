import { vi, describe, it, expect, beforeEach } from "vitest";
import {
  createAssignment,
  getAssignmentById,
  getOrderAssignments,
  getDeliveryAssignments,
  getDeliveryPendingAssignments,
  getAcceptedAssignment,
  completeAssignment,
  respondToAssignment,
  getDeliveryOrderHistory,
} from "../../../src/modules/delivery/delivery-assignments/delivery-assignments.controller.js";

vi.mock("../../../src/modules/delivery/delivery-assignments/delivery-assignments.service.js", () => ({
  createAssignmentService: vi.fn(),
  getAssignmentByIdService: vi.fn(),
  getOrderAssignmentsService: vi.fn(),
  getDeliveryAssignmentsService: vi.fn(),
  getDeliveryPendingAssignmentsService: vi.fn(),
  getAcceptedAssignmentService: vi.fn(),
  completeAssignmentService: vi.fn(),
  respondToAssignmentService: vi.fn(),
  getDeliveryOrderHistoryService: vi.fn(),
}));

vi.mock("../../../src/modules/delivery/delivery-assignments/delivery-assignments.validation.js", () => ({
  createAssignmentSchema: { parse: vi.fn((d) => d) },
  respondToAssignmentSchema: { parse: vi.fn((d) => d) },
  deliveryOrderHistoryQuerySchema: { parse: vi.fn((d) => d) },
}));

import {
  createAssignmentService,
  getAssignmentByIdService,
  getOrderAssignmentsService,
  getDeliveryAssignmentsService,
  getDeliveryPendingAssignmentsService,
  getAcceptedAssignmentService,
  completeAssignmentService,
  respondToAssignmentService,
  getDeliveryOrderHistoryService,
} from "../../../src/modules/delivery/delivery-assignments/delivery-assignments.service.js";

import {
  createAssignmentSchema,
  respondToAssignmentSchema,
  deliveryOrderHistoryQuerySchema,
} from "../../../src/modules/delivery/delivery-assignments/delivery-assignments.validation.js";

const makeCtx = (params = {}, body = {}, query = {}, user = { id_user: 1 }) => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const req = { user, params, body, query, pagination: { page: 1, limit: 10, skip: 0 } };
  return { req, res };
};

describe("createAssignment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 201 con la asignación creada", async () => {
    const { req, res } = makeCtx({}, { fk_order: 1 });
    createAssignmentService.mockResolvedValue({ id_delivery_assignment: 1 });
    await createAssignment(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("retorna 400 cuando Zod lanza ZodError", async () => {
    const { ZodError } = await import("zod");
    const zodErr = new ZodError([]);
    createAssignmentSchema.parse.mockImplementation(() => { throw zodErr; });
    const { req, res } = makeCtx({}, {});
    await createAssignment(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("retorna error status cuando el servicio falla", async () => {
    createAssignmentSchema.parse.mockReturnValue({ fk_order: 1 });
    const { req, res } = makeCtx({}, { fk_order: 1 });
    createAssignmentService.mockRejectedValue({ status: 409, message: "Conflicto" });
    await createAssignment(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });
});

describe("getAssignmentById", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 400 cuando el ID es inválido", async () => {
    const { req, res } = makeCtx({ id: "abc" });
    await getAssignmentById(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("retorna la asignación con status por defecto 200", async () => {
    const { req, res } = makeCtx({ id: "5" });
    getAssignmentByIdService.mockResolvedValue({ id_delivery_assignment: 5 });
    await getAssignmentById(req, res);
    expect(res.json).toHaveBeenCalledWith({ id_delivery_assignment: 5 });
  });

  it("retorna error status cuando el servicio falla", async () => {
    const { req, res } = makeCtx({ id: "5" });
    getAssignmentByIdService.mockRejectedValue({ status: 404, message: "No encontrado" });
    await getAssignmentById(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe("getOrderAssignments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 400 cuando orderId es inválido", async () => {
    const { req, res } = makeCtx({ orderId: "xyz" });
    await getOrderAssignments(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("retorna las asignaciones de la orden", async () => {
    const { req, res } = makeCtx({ orderId: "3" });
    getOrderAssignmentsService.mockResolvedValue([]);
    await getOrderAssignments(req, res);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it("retorna error status cuando el servicio falla", async () => {
    const { req, res } = makeCtx({ orderId: "3" });
    getOrderAssignmentsService.mockRejectedValue({ status: 500, message: "Error" });
    await getOrderAssignments(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("getDeliveryAssignments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 400 cuando deliveryId es inválido", async () => {
    const { req, res } = makeCtx({ deliveryId: "xyz" });
    await getDeliveryAssignments(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("retorna 400 cuando status es inválido", async () => {
    const { req, res } = makeCtx({ deliveryId: "1" }, {}, { status: "INVALID" });
    await getDeliveryAssignments(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("retorna las asignaciones con status válido", async () => {
    const { req, res } = makeCtx({ deliveryId: "1" }, {}, { status: "PENDING" });
    getDeliveryAssignmentsService.mockResolvedValue([]);
    await getDeliveryAssignments(req, res);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it("retorna todas las asignaciones sin filtro de status", async () => {
    const { req, res } = makeCtx({ deliveryId: "1" }, {}, {});
    getDeliveryAssignmentsService.mockResolvedValue([]);
    await getDeliveryAssignments(req, res);
    expect(getDeliveryAssignmentsService).toHaveBeenCalledWith(1, null);
  });
});

describe("getDeliveryPendingAssignments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 400 cuando deliveryId es inválido", async () => {
    const { req, res } = makeCtx({ deliveryId: "abc" });
    await getDeliveryPendingAssignments(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("retorna las asignaciones PENDING", async () => {
    const { req, res } = makeCtx({ deliveryId: "2" });
    getDeliveryPendingAssignmentsService.mockResolvedValue([]);
    await getDeliveryPendingAssignments(req, res);
    expect(res.json).toHaveBeenCalledWith([]);
  });
});

describe("getAcceptedAssignment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 400 cuando orderId es inválido", async () => {
    const { req, res } = makeCtx({ orderId: "abc" });
    await getAcceptedAssignment(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("retorna la asignación aceptada", async () => {
    const { req, res } = makeCtx({ orderId: "5" });
    getAcceptedAssignmentService.mockResolvedValue({ id_delivery_assignment: 1 });
    await getAcceptedAssignment(req, res);
    expect(res.json).toHaveBeenCalledWith({ id_delivery_assignment: 1 });
  });
});

describe("completeAssignment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 400 cuando el id es inválido", async () => {
    const { req, res } = makeCtx({ id: "abc" });
    await completeAssignment(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("retorna el resultado al completar la asignación", async () => {
    const { req, res } = makeCtx({ id: "3" });
    completeAssignmentService.mockResolvedValue({ completed: true });
    await completeAssignment(req, res);
    expect(res.json).toHaveBeenCalledWith({ completed: true });
  });

  it("retorna error status cuando el servicio falla", async () => {
    const { req, res } = makeCtx({ id: "3" });
    completeAssignmentService.mockRejectedValue({ status: 409, message: "Ya completado" });
    await completeAssignment(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });
});

describe("respondToAssignment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 200 al responder a la asignación", async () => {
    respondToAssignmentSchema.parse.mockReturnValue({ action: "ACCEPT" });
    const { req, res } = makeCtx({ orderId: "5" }, { action: "ACCEPT" });
    respondToAssignmentService.mockResolvedValue({ result: "ok" });
    await respondToAssignment(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("retorna 400 cuando Zod lanza ZodError", async () => {
    const { ZodError } = await import("zod");
    respondToAssignmentSchema.parse.mockImplementation(() => { throw new ZodError([]); });
    const { req, res } = makeCtx({ orderId: "5" }, {});
    await respondToAssignment(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("retorna error status cuando el servicio falla", async () => {
    respondToAssignmentSchema.parse.mockReturnValue({ action: "REJECT" });
    const { req, res } = makeCtx({ orderId: "5" }, { action: "REJECT" });
    respondToAssignmentService.mockRejectedValue({ status: 404, message: "No encontrado" });
    await respondToAssignment(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe("getDeliveryOrderHistory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 200 con el historial de pedidos", async () => {
    deliveryOrderHistoryQuerySchema.parse.mockReturnValue({});
    const { req, res } = makeCtx({ id: "2" }, {}, {});
    getDeliveryOrderHistoryService.mockResolvedValue({ data: [], meta: {} });
    await getDeliveryOrderHistory(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("retorna 400 cuando Zod lanza ZodError", async () => {
    const { ZodError } = await import("zod");
    deliveryOrderHistoryQuerySchema.parse.mockImplementation(() => { throw new ZodError([]); });
    const { req, res } = makeCtx({ id: "2" }, {}, {});
    await getDeliveryOrderHistory(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("retorna error status cuando el servicio falla", async () => {
    deliveryOrderHistoryQuerySchema.parse.mockReturnValue({});
    const { req, res } = makeCtx({ id: "2" });
    getDeliveryOrderHistoryService.mockRejectedValue({ status: 403, message: "Prohibido" });
    await getDeliveryOrderHistory(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});