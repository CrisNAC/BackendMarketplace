import { describe, it, expect } from "vitest";
import {
  CreateProductDTO,
  UpdateProductDTO,
  FilterProductDTO,
} from "../../../src/modules/global/dtos/products/product.request.dto.js";
import {
  ProductResponseDTO,
  ProductDetailResponseDTO,
  ProductCategoryNestedDTO,
  ProductTagNestedDTO,
} from "../../../src/modules/global/dtos/products/product.response.dto.js";

const NOW = new Date("2026-01-01T00:00:00.000Z");

const validProductData = {
  id_product: 1,
  name: "Laptop",
  description: "Laptop gaming",
  price: 1500000,
  offer_price: 1200000,
  is_offer: true,
  quantity: 5,
  visible: true,
  fk_store: 2,
  created_at: NOW,
  updated_at: NOW,
  product_category: { id_product_category: 3, name: "Electrónica" },
  product_tag_relations: [
    { product_tag: { id_product_tag: 1, name: "gaming" } },
    { product_tag: { id_product_tag: 2, name: "nueva" } },
  ],
};

// ─── CreateProductDTO ────────────────────────────────────────────────────────

describe("CreateProductDTO", () => {
  it("acepta datos válidos mínimos", () => {
    const result = CreateProductDTO.safeParse({
      name: "Laptop",
      price: 1500000,
      categoryId: 3,
    });
    expect(result.success).toBe(true);
  });

  it("acepta datos válidos completos", () => {
    const result = CreateProductDTO.safeParse({
      name: "Laptop",
      price: 1500000,
      categoryId: 3,
      description: "Descripción",
      quantity: 10,
      offerPrice: 1200000,
      isOffer: true,
      tags: [1, 2],
      visible: true,
    });
    expect(result.success).toBe(true);
  });

  it("falla cuando falta name", () => {
    const result = CreateProductDTO.safeParse({ price: 1000, categoryId: 1 });
    expect(result.success).toBe(false);
  });

  it("falla cuando falta price", () => {
    const result = CreateProductDTO.safeParse({ name: "Laptop", categoryId: 1 });
    expect(result.success).toBe(false);
  });

  it("falla cuando price es 0 o negativo", () => {
    const result = CreateProductDTO.safeParse({ name: "Laptop", price: 0, categoryId: 1 });
    expect(result.success).toBe(false);
  });

  it("falla cuando falta categoryId", () => {
    const result = CreateProductDTO.safeParse({ name: "Laptop", price: 1000 });
    expect(result.success).toBe(false);
  });

  it("falla cuando name supera 100 caracteres", () => {
    const result = CreateProductDTO.safeParse({ name: "x".repeat(101), price: 1000, categoryId: 1 });
    expect(result.success).toBe(false);
  });

  it("tags como array de números funciona", () => {
    const result = CreateProductDTO.safeParse({ name: "Laptop", price: 1000, categoryId: 1, tags: [1, 2, 3] });
    expect(result.success).toBe(true);
    expect(result.data.tags).toEqual([1, 2, 3]);
  });

  it("tags como string CSV se transforma a array", () => {
    const result = CreateProductDTO.safeParse({ name: "Laptop", price: 1000, categoryId: 1, tags: "1,2,3" });
    expect(result.success).toBe(true);
    expect(result.data.tags).toEqual([1, 2, 3]);
  });

  it("tags default es array vacío", () => {
    const result = CreateProductDTO.safeParse({ name: "Laptop", price: 1000, categoryId: 1 });
    expect(result.success).toBe(true);
    expect(result.data.tags).toEqual([]);
  });

  it("isOffer acepta string 'true'", () => {
    const result = CreateProductDTO.safeParse({ name: "L", price: 1000, categoryId: 1, isOffer: "true" });
    expect(result.success).toBe(true);
    expect(result.data.isOffer).toBe(true);
  });

  it("isOffer acepta string 'false'", () => {
    const result = CreateProductDTO.safeParse({ name: "L", price: 1000, categoryId: 1, isOffer: "false" });
    expect(result.success).toBe(true);
    expect(result.data.isOffer).toBe(false);
  });

  it("isOffer acepta string '1'", () => {
    const result = CreateProductDTO.safeParse({ name: "L", price: 1000, categoryId: 1, isOffer: "1" });
    expect(result.success).toBe(true);
    expect(result.data.isOffer).toBe(true);
  });

  it("visible acepta string '0'", () => {
    const result = CreateProductDTO.safeParse({ name: "L", price: 1000, categoryId: 1, visible: "0" });
    expect(result.success).toBe(true);
    expect(result.data.visible).toBe(false);
  });
});

// ─── UpdateProductDTO ────────────────────────────────────────────────────────

describe("UpdateProductDTO", () => {
  it("acepta actualización parcial con solo name", () => {
    const result = UpdateProductDTO.safeParse({ name: "Nuevo nombre" });
    expect(result.success).toBe(true);
  });

  it("acepta actualización parcial con solo price", () => {
    const result = UpdateProductDTO.safeParse({ price: 2000000 });
    expect(result.success).toBe(true);
  });

  it("falla cuando no se envía ningún campo (refine)", () => {
    const result = UpdateProductDTO.safeParse({});
    expect(result.success).toBe(false);
    const messages = result.error.issues.map((i) => i.message);
    expect(messages.some((m) => m.includes("al menos un campo"))).toBe(true);
  });

  it("falla cuando price es negativo", () => {
    const result = UpdateProductDTO.safeParse({ price: -100 });
    expect(result.success).toBe(false);
  });

  it("acepta offerPrice null", () => {
    const result = UpdateProductDTO.safeParse({ offerPrice: null });
    expect(result.success).toBe(true);
  });

  it("acepta quantity 0", () => {
    const result = UpdateProductDTO.safeParse({ quantity: 0 });
    expect(result.success).toBe(true);
  });
});

// ─── FilterProductDTO ────────────────────────────────────────────────────────

describe("FilterProductDTO", () => {
  it("acepta objeto vacío y aplica defaults", () => {
    const result = FilterProductDTO.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data.sortBy).toBe("created_at");
    expect(result.data.sortOrder).toBe("desc");
  });

  it("transforma categoryId de string a número", () => {
    const result = FilterProductDTO.safeParse({ categoryId: "3" });
    expect(result.success).toBe(true);
    expect(result.data.categoryId).toBe(3);
  });

  it("transforma isOffer string a boolean", () => {
    const result = FilterProductDTO.safeParse({ isOffer: "true" });
    expect(result.success).toBe(true);
    expect(result.data.isOffer).toBe(true);
  });

  it("falla cuando sortBy es inválido", () => {
    const result = FilterProductDTO.safeParse({ sortBy: "random" });
    expect(result.success).toBe(false);
  });

  it("falla cuando sortOrder es inválido", () => {
    const result = FilterProductDTO.safeParse({ sortOrder: "DESC" });
    expect(result.success).toBe(false);
  });

  it("falla cuando minPrice > maxPrice (refine)", () => {
    const result = FilterProductDTO.safeParse({ minPrice: "1000", maxPrice: "500" });
    expect(result.success).toBe(false);
    const messages = result.error.issues.map((i) => i.message);
    expect(messages.some((m) => m.includes("minPrice"))).toBe(true);
  });

  it("acepta minPrice == maxPrice", () => {
    const result = FilterProductDTO.safeParse({ minPrice: "1000", maxPrice: "1000" });
    expect(result.success).toBe(true);
  });

  it("ignora string vacío convirtiéndolo a undefined", () => {
    const result = FilterProductDTO.safeParse({ categoryId: "" });
    expect(result.success).toBe(true);
    expect(result.data.categoryId).toBeUndefined();
  });

  it("acepta sortBy válidos", () => {
    for (const sortBy of ["created_at", "price", "name"]) {
      const result = FilterProductDTO.safeParse({ sortBy });
      expect(result.success).toBe(true);
    }
  });
});

// ─── ProductCategoryNestedDTO ────────────────────────────────────────────────

describe("ProductCategoryNestedDTO", () => {
  it("asigna id y name", () => {
    const dto = new ProductCategoryNestedDTO({ id_product_category: 3, name: "Electrónica" });
    expect(dto.id_product_category).toBe(3);
    expect(dto.name).toBe("Electrónica");
  });
});

// ─── ProductTagNestedDTO ─────────────────────────────────────────────────────

describe("ProductTagNestedDTO", () => {
  it("asigna id y name", () => {
    const dto = new ProductTagNestedDTO({ id_product_tag: 1, name: "gaming" });
    expect(dto.id_product_tag).toBe(1);
    expect(dto.name).toBe("gaming");
  });
});

// ─── ProductResponseDTO ──────────────────────────────────────────────────────

describe("ProductResponseDTO", () => {
  it("mapea todos los campos correctamente", () => {
    const dto = new ProductResponseDTO(validProductData);
    expect(dto.id_product).toBe(1);
    expect(dto.name).toBe("Laptop");
    expect(dto.originalPrice).toBe(1500000);
    expect(dto.offerPrice).toBe(1200000);
    expect(dto.isOffer).toBe(true);
    expect(dto.price).toBe(1200000); // usa offerPrice cuando isOffer=true
    expect(dto.quantity).toBe(5);
    expect(dto.visible).toBe(true);
    expect(dto.fk_store).toBe(2);
    expect(dto.id).toBe(1);
  });

  it("price usa originalPrice cuando isOffer es false", () => {
    const dto = new ProductResponseDTO({ ...validProductData, is_offer: false });
    expect(dto.price).toBe(1500000);
  });

  it("offerPrice es null cuando offer_price es null", () => {
    const dto = new ProductResponseDTO({ ...validProductData, offer_price: null });
    expect(dto.offerPrice).toBeNull();
  });

  it("description es null cuando no se provee", () => {
    const dto = new ProductResponseDTO({ ...validProductData, description: undefined });
    expect(dto.description).toBeNull();
  });

  it("quantity es null cuando no se provee", () => {
    const dto = new ProductResponseDTO({ ...validProductData, quantity: undefined });
    expect(dto.quantity).toBeNull();
  });

  it("mapea product_category al DTO anidado", () => {
    const dto = new ProductResponseDTO(validProductData);
    expect(dto.product_category).toBeInstanceOf(ProductCategoryNestedDTO);
    expect(dto.product_category.id_product_category).toBe(3);
  });

  it("product_category es null cuando no hay categoría", () => {
    const dto = new ProductResponseDTO({ ...validProductData, product_category: null });
    expect(dto.product_category).toBeNull();
  });

  it("mapea tags desde product_tag_relations", () => {
    const dto = new ProductResponseDTO(validProductData);
    expect(dto.tags).toHaveLength(2);
    expect(dto.tags[0]).toBeInstanceOf(ProductTagNestedDTO);
    expect(dto.tags[0].name).toBe("gaming");
  });

  it("tags es array vacío cuando no hay relaciones", () => {
    const dto = new ProductResponseDTO({ ...validProductData, product_tag_relations: undefined });
    expect(dto.tags).toEqual([]);
  });

  it("static map() retorna instancia de ProductResponseDTO", () => {
    const dto = ProductResponseDTO.map(validProductData);
    expect(dto).toBeInstanceOf(ProductResponseDTO);
  });

  it("static mapList() retorna array mapeado", () => {
    const list = ProductResponseDTO.mapList([validProductData, { ...validProductData, id_product: 2 }]);
    expect(list).toHaveLength(2);
    expect(list[1].id_product).toBe(2);
  });
});

// ─── ProductDetailResponseDTO ────────────────────────────────────────────────

describe("ProductDetailResponseDTO", () => {
  it("agrega average_rating y review_count a los campos base", () => {
    const dto = new ProductDetailResponseDTO(validProductData, 4.5, 10);
    expect(dto.average_rating).toBe(4.5);
    expect(dto.review_count).toBe(10);
    expect(dto.id_product).toBe(1);
  });

  it("static mapWithStats() retorna instancia con stats", () => {
    const dto = ProductDetailResponseDTO.mapWithStats(validProductData, 3.8, 5);
    expect(dto).toBeInstanceOf(ProductDetailResponseDTO);
    expect(dto.average_rating).toBe(3.8);
    expect(dto.review_count).toBe(5);
  });
});