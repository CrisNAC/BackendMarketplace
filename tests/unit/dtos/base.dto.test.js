import { describe, it, expect } from "vitest";
import {
  BaseResponseDTO,
  PaginatedResponseDTO,
} from "../../../src/modules/global/dtos/base/base.response.dto.js";

const NOW = new Date("2026-01-01T00:00:00.000Z");

// ─── BaseResponseDTO ─────────────────────────────────────────────────────────

describe("BaseResponseDTO", () => {
  it("asigna id, created_at y updated_at desde data", () => {
    const dto = new BaseResponseDTO({ id: 5, created_at: NOW, updated_at: NOW });
    expect(dto.id).toBe(5);
    expect(dto.created_at).toBe(NOW);
    expect(dto.updated_at).toBe(NOW);
  });

  it("acepta id undefined sin lanzar error", () => {
    const dto = new BaseResponseDTO({ id: undefined, created_at: null, updated_at: null });
    expect(dto.id).toBeUndefined();
  });
});

// ─── PaginatedResponseDTO ────────────────────────────────────────────────────

describe("PaginatedResponseDTO", () => {
  it("calcula total_pages correctamente", () => {
    const dto = new PaginatedResponseDTO({
      content: [],
      total_elements: 25,
      size: 10,
      page: 1,
    });
    expect(dto.total_pages).toBe(3);
    expect(dto.total_elements).toBe(25);
    expect(dto.size).toBe(10);
    expect(dto.page).toBe(1);
  });

  it("retorna total_pages = 0 cuando size = 0", () => {
    const dto = new PaginatedResponseDTO({
      content: [],
      total_elements: 10,
      size: 0,
      page: 1,
    });
    expect(dto.total_pages).toBe(0);
    expect(dto.size).toBe(0);
  });

  it("total_pages = 1 cuando total_elements <= size", () => {
    const dto = new PaginatedResponseDTO({
      content: [1, 2],
      total_elements: 2,
      size: 10,
      page: 1,
    });
    expect(dto.total_pages).toBe(1);
  });

  it("redondea total_pages hacia arriba", () => {
    const dto = new PaginatedResponseDTO({
      content: [],
      total_elements: 11,
      size: 10,
      page: 2,
    });
    expect(dto.total_pages).toBe(2);
  });

  it("content se asigna directamente", () => {
    const items = [{ id: 1 }, { id: 2 }];
    const dto = new PaginatedResponseDTO({
      content: items,
      total_elements: 2,
      size: 10,
      page: 1,
    });
    expect(dto.content).toBe(items);
  });

  describe("PaginatedResponseDTO.from()", () => {
    it("crea instancia correcta a partir de parámetros individuales", () => {
      const items = ["a", "b", "c"];
      const dto = PaginatedResponseDTO.from(items, 30, 2, 10);
      expect(dto.content).toBe(items);
      expect(dto.total_elements).toBe(30);
      expect(dto.page).toBe(2);
      expect(dto.size).toBe(10);
      expect(dto.total_pages).toBe(3);
    });

    it("total_pages = 0 cuando limit = 0", () => {
      const dto = PaginatedResponseDTO.from([], 5, 1, 0);
      expect(dto.total_pages).toBe(0);
    });
  });
});