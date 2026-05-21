import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("../../../src/modules/global/banners/banners.service.js", () => ({
  getActiveBannersService: vi.fn(),
}));

import { getActiveBanners } from "../../../src/modules/global/banners/banners.controller.js";
import { getActiveBannersService } from "../../../src/modules/global/banners/banners.service.js";

const makeCtx = (query = {}) => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const req = { query };
  const next = vi.fn();
  return { req, res, next };
};

describe("getActiveBanners", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 200 con banners activos", async () => {
    const { req, res, next } = makeCtx({ limit: "5" });
    getActiveBannersService.mockResolvedValue([]);
    await getActiveBanners(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it("llama next cuando falla", async () => {
    const { req, res, next } = makeCtx();
    getActiveBannersService.mockRejectedValue(new Error("fail"));
    await getActiveBanners(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
