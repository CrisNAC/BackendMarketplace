import { describe, it, expect } from "vitest";
import {
  CreateStoreDTO,
  UpdateStoreDTO,
  FilterStoreDTO,
} from "../../../src/modules/global/dtos/commerce/store.request.dto.js";
import {
  StoreResponseDTO,
  StoreCategoryNestedDTO,
} from "../../../src/modules/global/dtos/commerce/store.response.dto.js";
import { FilterStoreProductsDTO } from "../../../src/modules/global/dtos/commerce/filter-store-products.dto.js";

const NOW = new Date("2026-01-01T00:00:00.000Z");

const validStoreData = {
  id_store: 1,
  name: "TechStore",
  email: "tech@store.com",
  phone: "+56912345678",
  description: "Tienda de tecnología",
  logo: null,
  website_url: null,
  instagram_url: null,
  tiktok_url: null,
  fk_user: 5,
  store_category: { id_store_category: 2, name: "Electrónica" },
  created_at: NOW,
  updated_at: NOW,
};

// ─── CreateStoreDTO ──────────────────────────────────────────────────────────

describe("CreateStoreDTO", () => {
  it("acepta datos válidos mínimos", () => {
    const result = CreateStoreDTO.safeParse({
      fk_user: 1,
      fk_store_category: 2,
      name: "TechStore",
      email: "tech@store.com",
      phone: "+56912345678",
    });
    expect(result.success).toBe(true);
  });

  it("acepta datos válidos completos con URLs", () => {
    const result = CreateStoreDTO.safeParse({
      fk_user: 1,
      fk_store_category: 2,
      name: "TechStore",
      email: "tech@store.com",
      phone: "+56912345678",
      description: "Descripción",
      logo: "https://img.example.com/logo.png",
      website_url: "https://techstore.com",
      instagram_url: "https://instagram.com/techstore",
      tiktok_url: "https://tiktok.com/@techstore",
    });
    expect(result.success).toBe(true);
  });

  it("falla cuando falta fk_user", () => {
    const result = CreateStoreDTO.safeParse({ fk_store_category: 1, name: "S", email: "s@s.com", phone: "123" });
    expect(result.success).toBe(false);
  });

  it("falla cuando falta name", () => {
    const result = CreateStoreDTO.safeParse({ fk_user: 1, fk_store_category: 1, email: "s@s.com", phone: "123" });
    expect(result.success).toBe(false);
  });

  it("falla con email inválido", () => {
    const result = CreateStoreDTO.safeParse({ fk_user: 1, fk_store_category: 1, name: "S", email: "no-email", phone: "123" });
    expect(result.success).toBe(false);
    const messages = result.error.issues.map((i) => i.message);
    expect(messages.some((m) => m.includes("formato válido"))).toBe(true);
  });

  it("falla cuando falta phone", () => {
    const result = CreateStoreDTO.safeParse({ fk_user: 1, fk_store_category: 1, name: "S", email: "s@s.com" });
    expect(result.success).toBe(false);
  });

  it("falla cuando logo no es URL válida", () => {
    const result = CreateStoreDTO.safeParse({
      fk_user: 1, fk_store_category: 1, name: "S", email: "s@s.com", phone: "123",
      logo: "no-es-url",
    });
    expect(result.success).toBe(false);
  });

  it("falla cuando website_url no es URL válida", () => {
    const result = CreateStoreDTO.safeParse({
      fk_user: 1, fk_store_category: 1, name: "S", email: "s@s.com", phone: "123",
      website_url: "no-es-url",
    });
    expect(result.success).toBe(false);
  });

  it("acepta logo y URLs null o sin enviar", () => {
    const result = CreateStoreDTO.safeParse({
      fk_user: 1, fk_store_category: 1, name: "S", email: "s@s.com", phone: "123",
      logo: null, website_url: null,
    });
    expect(result.success).toBe(true);
  });
});

// ─── UpdateStoreDTO ──────────────────────────────────────────────────────────

describe("UpdateStoreDTO", () => {
  it("acepta actualización parcial con solo name", () => {
    const result = UpdateStoreDTO.safeParse({ name: "Nuevo nombre" });
    expect(result.success).toBe(true);
  });

  it("acepta actualización parcial con solo email", () => {
    const result = UpdateStoreDTO.safeParse({ email: "nuevo@store.com" });
    expect(result.success).toBe(true);
  });

  it("falla cuando no se envía ningún campo", () => {
    const result = UpdateStoreDTO.safeParse({});
    expect(result.success).toBe(false);
    const messages = result.error.issues.map((i) => i.message);
    expect(messages.some((m) => m.includes("al menos un campo"))).toBe(true);
  });

  it("falla con email inválido", () => {
    const result = UpdateStoreDTO.safeParse({ email: "no-valido" });
    expect(result.success).toBe(false);
  });

  it("falla con instagram_url inválida", () => {
    const result = UpdateStoreDTO.safeParse({ instagram_url: "no-es-url" });
    expect(result.success).toBe(false);
  });

  it("acepta instagram_url null", () => {
    const result = UpdateStoreDTO.safeParse({ instagram_url: null });
    expect(result.success).toBe(true);
  });
});

// ─── FilterStoreDTO ──────────────────────────────────────────────────────────

describe("FilterStoreDTO", () => {
  it("acepta objeto vacío con defaults", () => {
    const result = FilterStoreDTO.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data.page).toBe(1);
    expect(result.data.limit).toBe(10);
  });

  it("transforma fk_store_category de string a número", () => {
    const result = FilterStoreDTO.safeParse({ fk_store_category: "3" });
    expect(result.success).toBe(true);
    expect(result.data.fk_store_category).toBe(3);
  });

  it("falla con limit mayor a 100", () => {
    const result = FilterStoreDTO.safeParse({ limit: "200" });
    expect(result.success).toBe(false);
  });

  it("acepta filtro por name", () => {
    const result = FilterStoreDTO.safeParse({ name: "Tech" });
    expect(result.success).toBe(true);
  });
});

// ─── StoreCategoryNestedDTO ──────────────────────────────────────────────────

describe("StoreCategoryNestedDTO", () => {
  it("asigna id_store_category y name", () => {
    const dto = new StoreCategoryNestedDTO({ id_store_category: 2, name: "Electrónica" });
    expect(dto.id_store_category).toBe(2);
    expect(dto.name).toBe("Electrónica");
  });
});

// ─── StoreResponseDTO ────────────────────────────────────────────────────────

describe("StoreResponseDTO", () => {
  it("mapea todos los campos correctamente", () => {
    const dto = new StoreResponseDTO(validStoreData);
    expect(dto.id_store).toBe(1);
    expect(dto.name).toBe("TechStore");
    expect(dto.email).toBe("tech@store.com");
    expect(dto.phone).toBe("+56912345678");
    expect(dto.fk_user).toBe(5);
    expect(dto.id).toBe(1);
    expect(dto.created_at).toBe(NOW);
  });

  it("description es null cuando no se provee", () => {
    const dto = new StoreResponseDTO({ ...validStoreData, description: undefined });
    expect(dto.description).toBeNull();
  });

  it("logo es null cuando no se provee", () => {
    const dto = new StoreResponseDTO({ ...validStoreData, logo: undefined });
    expect(dto.logo).toBeNull();
  });

  it("website_url, instagram_url, tiktok_url son null por defecto", () => {
    const dto = new StoreResponseDTO(validStoreData);
    expect(dto.website_url).toBeNull();
    expect(dto.instagram_url).toBeNull();
    expect(dto.tiktok_url).toBeNull();
  });

  it("store_category es instancia de StoreCategoryNestedDTO cuando existe", () => {
    const dto = new StoreResponseDTO(validStoreData);
    expect(dto.store_category).toBeInstanceOf(StoreCategoryNestedDTO);
    expect(dto.store_category.name).toBe("Electrónica");
  });

  it("store_category es null cuando no se provee", () => {
    const dto = new StoreResponseDTO({ ...validStoreData, store_category: null });
    expect(dto.store_category).toBeNull();
  });

  it("static map() retorna instancia de StoreResponseDTO", () => {
    const dto = StoreResponseDTO.map(validStoreData);
    expect(dto).toBeInstanceOf(StoreResponseDTO);
  });

  it("static mapList() retorna array mapeado", () => {
    const list = StoreResponseDTO.mapList([validStoreData, { ...validStoreData, id_store: 2 }]);
    expect(list).toHaveLength(2);
    expect(list[1].id_store).toBe(2);
  });
});

// ─── FilterStoreProductsDTO ──────────────────────────────────────────────────

describe("FilterStoreProductsDTO", () => {
  it("acepta objeto vacío con defaults", () => {
    const result = FilterStoreProductsDTO.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data.sortBy).toBe("created_at");
    expect(result.data.sortOrder).toBe("desc");
  });

  it("transforma category de string a número", () => {
    const result = FilterStoreProductsDTO.safeParse({ category: "3" });
    expect(result.success).toBe(true);
    expect(result.data.category).toBe(3);
  });

  it("transforma available de string a boolean", () => {
    const result = FilterStoreProductsDTO.safeParse({ available: "true" });
    expect(result.success).toBe(true);
    expect(result.data.available).toBe(true);
  });

  it("transforma isOffer '0' a false", () => {
    const result = FilterStoreProductsDTO.safeParse({ isOffer: "0" });
    expect(result.success).toBe(true);
    expect(result.data.isOffer).toBe(false);
  });

  it("falla cuando price_min > price_max (refine)", () => {
    const result = FilterStoreProductsDTO.safeParse({ price_min: "1000", price_max: "500" });
    expect(result.success).toBe(false);
    const messages = result.error.issues.map((i) => i.message);
    expect(messages.some((m) => m.includes("price_min"))).toBe(true);
  });

  it("acepta price_min == price_max", () => {
    const result = FilterStoreProductsDTO.safeParse({ price_min: "500", price_max: "500" });
    expect(result.success).toBe(true);
  });

  it("ignora string vacío convirtiéndolo a undefined", () => {
    const result = FilterStoreProductsDTO.safeParse({ category: "" });
    expect(result.success).toBe(true);
    expect(result.data.category).toBeUndefined();
  });

  it("falla con sortBy inválido", () => {
    const result = FilterStoreProductsDTO.safeParse({ sortBy: "rating" });
    expect(result.success).toBe(false);
  });

  it("acepta sortOrder asc", () => {
    const result = FilterStoreProductsDTO.safeParse({ sortOrder: "asc" });
    expect(result.success).toBe(true);
    expect(result.data.sortOrder).toBe("asc");
  });
});