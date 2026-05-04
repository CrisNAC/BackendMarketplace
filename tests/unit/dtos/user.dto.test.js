import { describe, it, expect } from "vitest";
import {
  CreateUserDTO,
  UpdateUserDTO,
  FilterUserDTO,
} from "../../../src/modules/global/dtos/users/user.request.dto.js";
import { UserResponseDTO } from "../../../src/modules/global/dtos/users/user.response.dto.js";

const NOW = new Date("2026-01-01T00:00:00.000Z");

const validUser = {
  id_user: 1,
  name: "Juan Pérez",
  email: "juan@test.com",
  phone: "+56912345678",
  role: "CUSTOMER",
  created_at: NOW,
  updated_at: NOW,
};

// ─── CreateUserDTO ───────────────────────────────────────────────────────────

describe("CreateUserDTO", () => {
  it("acepta datos válidos completos", () => {
    const result = CreateUserDTO.safeParse({
      name: "Juan",
      email: "juan@test.com",
      password: "secret123",
      phone: "+56912345678",
      role: "SELLER",
    });
    expect(result.success).toBe(true);
  });

  it("usa CUSTOMER como role por defecto", () => {
    const result = CreateUserDTO.safeParse({
      name: "Juan",
      email: "juan@test.com",
      password: "secret123",
    });
    expect(result.success).toBe(true);
    expect(result.data.role).toBe("CUSTOMER");
  });

  it("falla cuando falta name", () => {
    const result = CreateUserDTO.safeParse({ email: "j@t.com", password: "secret123" });
    expect(result.success).toBe(false);
  });

  it("falla cuando falta email", () => {
    const result = CreateUserDTO.safeParse({ name: "Juan", password: "secret123" });
    expect(result.success).toBe(false);
  });

  it("falla con email de formato inválido", () => {
    const result = CreateUserDTO.safeParse({ name: "Juan", email: "no-es-email", password: "secret123" });
    expect(result.success).toBe(false);
    const messages = result.error.issues.map((i) => i.message);
    expect(messages.some((m) => m.includes("formato válido"))).toBe(true);
  });

  it("falla cuando falta password", () => {
    const result = CreateUserDTO.safeParse({ name: "Juan", email: "j@t.com" });
    expect(result.success).toBe(false);
  });

  it("falla cuando password tiene menos de 8 caracteres", () => {
    const result = CreateUserDTO.safeParse({ name: "Juan", email: "j@t.com", password: "abc" });
    expect(result.success).toBe(false);
    const messages = result.error.issues.map((i) => i.message);
    expect(messages.some((m) => m.includes("8 caracteres"))).toBe(true);
  });

  it("falla con role inválido", () => {
    const result = CreateUserDTO.safeParse({ name: "Juan", email: "j@t.com", password: "secret123", role: "SUPERADMIN" });
    expect(result.success).toBe(false);
  });

  it("acepta todos los roles válidos", () => {
    for (const role of ["ADMIN", "CUSTOMER", "SELLER", "DELIVERY"]) {
      const result = CreateUserDTO.safeParse({ name: "Juan", email: "j@t.com", password: "secret123", role });
      expect(result.success).toBe(true);
    }
  });

  it("acepta phone null o sin enviar", () => {
    const result = CreateUserDTO.safeParse({ name: "Juan", email: "j@t.com", password: "secret123", phone: null });
    expect(result.success).toBe(true);
  });

  it("falla cuando name supera 100 caracteres", () => {
    const result = CreateUserDTO.safeParse({ name: "a".repeat(101), email: "j@t.com", password: "secret123" });
    expect(result.success).toBe(false);
  });
});

// ─── UpdateUserDTO ───────────────────────────────────────────────────────────

describe("UpdateUserDTO", () => {
  it("acepta actualización parcial con solo name", () => {
    const result = UpdateUserDTO.safeParse({ name: "Nuevo Nombre" });
    expect(result.success).toBe(true);
  });

  it("acepta actualización parcial con solo email", () => {
    const result = UpdateUserDTO.safeParse({ email: "nuevo@test.com" });
    expect(result.success).toBe(true);
  });

  it("acepta actualización parcial con solo password", () => {
    const result = UpdateUserDTO.safeParse({ password: "newpass123" });
    expect(result.success).toBe(true);
  });

  it("falla cuando no se envía ningún campo (refine)", () => {
    const result = UpdateUserDTO.safeParse({});
    expect(result.success).toBe(false);
    const messages = result.error.issues.map((i) => i.message);
    expect(messages.some((m) => m.includes("al menos un campo"))).toBe(true);
  });

  it("falla con email inválido", () => {
    const result = UpdateUserDTO.safeParse({ email: "no-valido" });
    expect(result.success).toBe(false);
  });

  it("falla con password corto", () => {
    const result = UpdateUserDTO.safeParse({ password: "abc" });
    expect(result.success).toBe(false);
  });

  it("acepta phone null", () => {
    const result = UpdateUserDTO.safeParse({ phone: null });
    expect(result.success).toBe(true);
  });
});

// ─── FilterUserDTO ───────────────────────────────────────────────────────────

describe("FilterUserDTO", () => {
  it("acepta objeto vacío y aplica defaults", () => {
    const result = FilterUserDTO.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data.page).toBe(1);
    expect(result.data.limit).toBe(10);
  });

  it("transforma page y limit de string a número", () => {
    const result = FilterUserDTO.safeParse({ page: "2", limit: "20" });
    expect(result.success).toBe(true);
    expect(result.data.page).toBe(2);
    expect(result.data.limit).toBe(20);
  });

  it("falla con role inválido", () => {
    const result = FilterUserDTO.safeParse({ role: "GHOST" });
    expect(result.success).toBe(false);
  });

  it("falla con email de formato inválido en filtro", () => {
    const result = FilterUserDTO.safeParse({ email: "no-es-email" });
    expect(result.success).toBe(false);
  });

  it("falla con limit mayor a 100", () => {
    const result = FilterUserDTO.safeParse({ limit: "101" });
    expect(result.success).toBe(false);
  });

  it("acepta filtro por name", () => {
    const result = FilterUserDTO.safeParse({ name: "Juan" });
    expect(result.success).toBe(true);
    expect(result.data.name).toBe("Juan");
  });
});

// ─── UserResponseDTO ─────────────────────────────────────────────────────────

describe("UserResponseDTO", () => {
  it("mapea todos los campos correctamente", () => {
    const dto = new UserResponseDTO(validUser);
    expect(dto.id_user).toBe(1);
    expect(dto.name).toBe("Juan Pérez");
    expect(dto.email).toBe("juan@test.com");
    expect(dto.phone).toBe("+56912345678");
    expect(dto.role).toBe("CUSTOMER");
    expect(dto.id).toBe(1);
    expect(dto.created_at).toBe(NOW);
  });

  it("phone es null cuando no se provee", () => {
    const dto = new UserResponseDTO({ ...validUser, phone: undefined });
    expect(dto.phone).toBeNull();
  });

  it("static map() retorna instancia de UserResponseDTO", () => {
    const dto = UserResponseDTO.map(validUser);
    expect(dto).toBeInstanceOf(UserResponseDTO);
    expect(dto.id_user).toBe(1);
  });

  it("static mapList() retorna array de UserResponseDTO", () => {
    const list = UserResponseDTO.mapList([validUser, { ...validUser, id_user: 2 }]);
    expect(list).toHaveLength(2);
    expect(list[0]).toBeInstanceOf(UserResponseDTO);
    expect(list[1].id_user).toBe(2);
  });

  it("mapList con array vacío retorna array vacío", () => {
    expect(UserResponseDTO.mapList([])).toEqual([]);
  });
});