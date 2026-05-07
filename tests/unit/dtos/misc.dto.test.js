import { describe, it, expect } from "vitest";

// ─── Address ─────────────────────────────────────────────────────────────────
import {
  CreateAddressDTO,
  UpdateAddressDTO,
  FilterAddressDTO,
  AddressResponseDTO,
} from "../../../src/modules/global/dtos/addresses/address.dto.js";

// ─── Notification ─────────────────────────────────────────────────────────────
import {
  CreateNotificationDTO,
  UpdateNotificationDTO,
  FilterNotificationDTO,
  NotificationResponseDTO,
} from "../../../src/modules/global/dtos/notifications/notification.dto.js";

// ─── Wishlist ─────────────────────────────────────────────────────────────────
import {
  CreateWishlistDTO,
  UpdateWishlistDTO,
  FilterWishlistDTO,
  CreateWishlistItemDTO,
  UpdateWishlistItemDTO,
  WishlistResponseDTO,
  WishlistItemResponseDTO,
} from "../../../src/modules/global/dtos/wishlists/wishlist.dto.js";

// ─── ProductCategory ──────────────────────────────────────────────────────────
import {
  CreateProductCategoryDTO,
  UpdateProductCategoryDTO,
  FilterProductCategoryDTO,
  ProductCategoryResponseDTO,
} from "../../../src/modules/global/dtos/product-categories/product-category.dto.js";

// ─── ProductReview ────────────────────────────────────────────────────────────
import {
  CreateProductReviewDTO,
  UpdateProductReviewDTO,
  FilterProductReviewDTO,
  ProductReviewResponseDTO,
  ProductReviewsWithStatsResponseDTO,
} from "../../../src/modules/global/dtos/product-reviews/product-review.dto.js";

// ─── ProductTag ───────────────────────────────────────────────────────────────
import {
  CreateProductTagDTO,
  UpdateProductTagDTO,
  FilterProductTagDTO,
  ProductTagResponseDTO,
} from "../../../src/modules/global/dtos/product-tags/product-tag.dto.js";

// ─── StoreCategory ────────────────────────────────────────────────────────────
import {
  CreateStoreCategoryDTO,
  UpdateStoreCategoryDTO,
  FilterStoreCategoryDTO,
  StoreCategoryResponseDTO,
} from "../../../src/modules/global/dtos/store-categories/store-category.dto.js";

// ─── ShippingZone ─────────────────────────────────────────────────────────────
import {
  CreateShippingZoneDTO,
  UpdateShippingZoneDTO,
  FilterShippingZoneDTO,
  ShippingZoneResponseDTO,
} from "../../../src/modules/global/dtos/shipping-zones/shipping-zone.dto.js";

// ─── Collection ───────────────────────────────────────────────────────────────
import {
  CreateCollectionDTO,
  UpdateCollectionDTO,
  FilterCollectionDTO,
  CollectionResponseDTO,
} from "../../../src/modules/global/dtos/collections/collection.dto.js";

const NOW = new Date("2026-01-01T00:00:00.000Z");

// ═══════════════════════════════════════════════════════════════════════════════
// ADDRESS
// ═══════════════════════════════════════════════════════════════════════════════

describe("CreateAddressDTO", () => {
  it("acepta datos válidos completos", () => {
    const result = CreateAddressDTO.safeParse({
      fk_user: 1, address: "Calle 123", city: "Santiago", region: "RM",
    });
    expect(result.success).toBe(true);
  });

  it("falla cuando falta fk_user", () => {
    const result = CreateAddressDTO.safeParse({ address: "Calle 123", city: "Santiago", region: "RM" });
    expect(result.success).toBe(false);
  });

  it("falla cuando falta address", () => {
    const result = CreateAddressDTO.safeParse({ fk_user: 1, city: "Santiago", region: "RM" });
    expect(result.success).toBe(false);
  });

  it("falla cuando address está vacío", () => {
    const result = CreateAddressDTO.safeParse({ fk_user: 1, address: "  ", city: "Santiago", region: "RM" });
    expect(result.success).toBe(false);
  });

  it("acepta postal_code null u opcional", () => {
    const result = CreateAddressDTO.safeParse({ fk_user: 1, address: "Calle", city: "Santiago", region: "RM", postal_code: null });
    expect(result.success).toBe(true);
  });

  it("falla cuando city supera 100 caracteres", () => {
    const result = CreateAddressDTO.safeParse({ fk_user: 1, address: "Calle", city: "x".repeat(101), region: "RM" });
    expect(result.success).toBe(false);
  });
});

describe("UpdateAddressDTO", () => {
  it("acepta actualización parcial con solo city", () => {
    const result = UpdateAddressDTO.safeParse({ city: "Valparaíso" });
    expect(result.success).toBe(true);
  });

  it("falla cuando no se envía ningún campo", () => {
    const result = UpdateAddressDTO.safeParse({});
    expect(result.success).toBe(false);
    const messages = result.error.issues.map((i) => i.message);
    expect(messages.some((m) => m.includes("al menos un campo"))).toBe(true);
  });

  it("falla cuando address vacío (trim)", () => {
    const result = UpdateAddressDTO.safeParse({ address: "" });
    expect(result.success).toBe(false);
  });
});

describe("FilterAddressDTO", () => {
  it("acepta objeto vacío con defaults", () => {
    const result = FilterAddressDTO.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data.page).toBe(1);
    expect(result.data.limit).toBe(10);
  });

  it("transforma fk_user de string a número", () => {
    const result = FilterAddressDTO.safeParse({ fk_user: "5" });
    expect(result.success).toBe(true);
    expect(result.data.fk_user).toBe(5);
  });
});

describe("AddressResponseDTO", () => {
  const data = {
    id_address: 1, fk_user: 2, fk_store: null, address: "Calle 123",
    city: "Santiago", region: "RM", postal_code: "8320000",
    created_at: NOW, updated_at: NOW,
  };

  it("mapea todos los campos correctamente", () => {
    const dto = new AddressResponseDTO(data);
    expect(dto.id_address).toBe(1);
    expect(dto.fk_user).toBe(2);
    expect(dto.address).toBe("Calle 123");
    expect(dto.city).toBe("Santiago");
    expect(dto.region).toBe("RM");
    expect(dto.postal_code).toBe("8320000");
    expect(dto.id).toBe(1);
  });

  it("fk_store y postal_code son null cuando no se proveen", () => {
    const dto = new AddressResponseDTO({ ...data, fk_store: undefined, postal_code: undefined });
    expect(dto.fk_store).toBeNull();
    expect(dto.postal_code).toBeNull();
  });

  it("static map() funciona correctamente", () => {
    expect(AddressResponseDTO.map(data)).toBeInstanceOf(AddressResponseDTO);
  });

  it("static mapList() retorna array mapeado", () => {
    const list = AddressResponseDTO.mapList([data, { ...data, id_address: 2 }]);
    expect(list).toHaveLength(2);
    expect(list[1].id_address).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("CreateNotificationDTO", () => {
  it("acepta datos válidos", () => {
    const result = CreateNotificationDTO.safeParse({ fk_user: 1, title: "Aviso", message: "Texto" });
    expect(result.success).toBe(true);
  });

  it("falla cuando falta fk_user", () => {
    const result = CreateNotificationDTO.safeParse({ title: "Aviso" });
    expect(result.success).toBe(false);
  });

  it("falla cuando falta title", () => {
    const result = CreateNotificationDTO.safeParse({ fk_user: 1 });
    expect(result.success).toBe(false);
  });

  it("falla cuando title está vacío", () => {
    const result = CreateNotificationDTO.safeParse({ fk_user: 1, title: "" });
    expect(result.success).toBe(false);
  });

  it("acepta message null u opcional", () => {
    const result = CreateNotificationDTO.safeParse({ fk_user: 1, title: "Aviso", message: null });
    expect(result.success).toBe(true);
  });

  it("falla cuando title supera 100 caracteres", () => {
    const result = CreateNotificationDTO.safeParse({ fk_user: 1, title: "x".repeat(101) });
    expect(result.success).toBe(false);
  });
});

describe("UpdateNotificationDTO", () => {
  it("acepta read: true", () => {
    const result = UpdateNotificationDTO.safeParse({ read: true });
    expect(result.success).toBe(true);
  });

  it("acepta read: false", () => {
    const result = UpdateNotificationDTO.safeParse({ read: false });
    expect(result.success).toBe(true);
  });

  it("falla cuando no se envía ningún campo", () => {
    const result = UpdateNotificationDTO.safeParse({});
    expect(result.success).toBe(false);
    const messages = result.error.issues.map((i) => i.message);
    expect(messages.some((m) => m.includes("al menos un campo"))).toBe(true);
  });
});

describe("FilterNotificationDTO", () => {
  it("acepta objeto vacío con defaults", () => {
    const result = FilterNotificationDTO.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data.page).toBe(1);
    expect(result.data.limit).toBe(10);
  });

  it("transforma read 'true' a boolean true", () => {
    const result = FilterNotificationDTO.safeParse({ read: "true" });
    expect(result.success).toBe(true);
    expect(result.data.read).toBe(true);
  });

  it("transforma read 'false' a boolean false", () => {
    const result = FilterNotificationDTO.safeParse({ read: "false" });
    expect(result.success).toBe(true);
    expect(result.data.read).toBe(false);
  });
});

describe("NotificationResponseDTO", () => {
  const data = { id_notification: 1, fk_user: 2, title: "Aviso", message: "Texto", read: false, created_at: NOW, updated_at: NOW };

  it("mapea todos los campos correctamente", () => {
    const dto = new NotificationResponseDTO(data);
    expect(dto.id_notification).toBe(1);
    expect(dto.fk_user).toBe(2);
    expect(dto.title).toBe("Aviso");
    expect(dto.message).toBe("Texto");
    expect(dto.read).toBe(false);
    expect(dto.id).toBe(1);
  });

  it("message es null cuando no se provee", () => {
    const dto = new NotificationResponseDTO({ ...data, message: undefined });
    expect(dto.message).toBeNull();
  });

  it("static map() y mapList() funcionan", () => {
    expect(NotificationResponseDTO.map(data)).toBeInstanceOf(NotificationResponseDTO);
    const list = NotificationResponseDTO.mapList([data, { ...data, id_notification: 2 }]);
    expect(list).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// WISHLIST
// ═══════════════════════════════════════════════════════════════════════════════

describe("CreateWishlistDTO", () => {
  it("acepta nombre válido", () => {
    const result = CreateWishlistDTO.safeParse({ name: "Favoritos" });
    expect(result.success).toBe(true);
  });

  it("falla cuando falta name", () => {
    const result = CreateWishlistDTO.safeParse({});
    expect(result.success).toBe(false);
  });

  it("falla cuando name está vacío", () => {
    const result = CreateWishlistDTO.safeParse({ name: "  " });
    expect(result.success).toBe(false);
  });

  it("falla cuando name supera 50 caracteres", () => {
    const result = CreateWishlistDTO.safeParse({ name: "x".repeat(51) });
    expect(result.success).toBe(false);
  });
});

describe("UpdateWishlistDTO", () => {
  it("acepta actualización con name", () => {
    const result = UpdateWishlistDTO.safeParse({ name: "Nueva lista" });
    expect(result.success).toBe(true);
  });

  it("falla cuando no se envía ningún campo", () => {
    const result = UpdateWishlistDTO.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("FilterWishlistDTO", () => {
  it("acepta objeto vacío con defaults", () => {
    const result = FilterWishlistDTO.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data.page).toBe(1);
    expect(result.data.limit).toBe(10);
  });
});

describe("CreateWishlistItemDTO", () => {
  it("acepta datos válidos", () => {
    const result = CreateWishlistItemDTO.safeParse({ fk_product: 1, quantity: 2 });
    expect(result.success).toBe(true);
  });

  it("falla cuando quantity es 0", () => {
    const result = CreateWishlistItemDTO.safeParse({ fk_product: 1, quantity: 0 });
    expect(result.success).toBe(false);
  });

  it("falla cuando falta fk_product", () => {
    const result = CreateWishlistItemDTO.safeParse({ quantity: 1 });
    expect(result.success).toBe(false);
  });
});

describe("UpdateWishlistItemDTO", () => {
  it("acepta actualización de quantity", () => {
    const result = UpdateWishlistItemDTO.safeParse({ quantity: 3 });
    expect(result.success).toBe(true);
  });

  it("falla cuando no se envía ningún campo", () => {
    const result = UpdateWishlistItemDTO.safeParse({});
    expect(result.success).toBe(false);
  });

  it("falla cuando quantity es 0", () => {
    const result = UpdateWishlistItemDTO.safeParse({ quantity: 0 });
    expect(result.success).toBe(false);
  });
});

describe("WishlistResponseDTO", () => {
  const data = {
    id_wishlist: 1, fk_user: 2, name: "Favoritos",
    wishlist_items: [{ id_wishlist_item: 1, fk_product: 3, quantity: 2 }],
    created_at: NOW, updated_at: NOW,
  };

  it("mapea todos los campos correctamente", () => {
    const dto = new WishlistResponseDTO(data);
    expect(dto.id_wishlist).toBe(1);
    expect(dto.fk_user).toBe(2);
    expect(dto.name).toBe("Favoritos");
    expect(dto.id).toBe(1);
  });

  it("mapea items como array de WishlistItemResponseDTO", () => {
    const dto = new WishlistResponseDTO(data);
    expect(dto.items).toHaveLength(1);
    expect(dto.items[0]).toBeInstanceOf(WishlistItemResponseDTO);
    expect(dto.items[0].fk_product).toBe(3);
    expect(dto.items[0].quantity).toBe(2);
  });

  it("items es array vacío cuando no hay wishlist_items", () => {
    const dto = new WishlistResponseDTO({ ...data, wishlist_items: undefined });
    expect(dto.items).toEqual([]);
  });

  it("static map() y mapList() funcionan correctamente", () => {
    expect(WishlistResponseDTO.map(data)).toBeInstanceOf(WishlistResponseDTO);
    const list = WishlistResponseDTO.mapList([data, { ...data, id_wishlist: 2 }]);
    expect(list).toHaveLength(2);
  });

  it("mapList con array vacío retorna array vacío", () => {
    expect(WishlistResponseDTO.mapList([])).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCT CATEGORY
// ═══════════════════════════════════════════════════════════════════════════════

describe("CreateProductCategoryDTO", () => {
  it("acepta nombre válido", () => {
    const result = CreateProductCategoryDTO.safeParse({ name: "Electrónica" });
    expect(result.success).toBe(true);
  });

  it("falla cuando falta name", () => {
    const result = CreateProductCategoryDTO.safeParse({});
    expect(result.success).toBe(false);
  });

  it("falla cuando name está vacío", () => {
    const result = CreateProductCategoryDTO.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("falla cuando name supera 100 caracteres", () => {
    const result = CreateProductCategoryDTO.safeParse({ name: "x".repeat(101) });
    expect(result.success).toBe(false);
  });
});

describe("UpdateProductCategoryDTO", () => {
  it("acepta name actualizado", () => {
    const result = UpdateProductCategoryDTO.safeParse({ name: "Ropa" });
    expect(result.success).toBe(true);
  });

  it("falla cuando no se envía ningún campo", () => {
    const result = UpdateProductCategoryDTO.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("FilterProductCategoryDTO", () => {
  it("acepta objeto vacío con defaults", () => {
    const result = FilterProductCategoryDTO.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data.page).toBe(1);
    expect(result.data.limit).toBe(10);
  });
});

describe("ProductCategoryResponseDTO", () => {
  const data = { id_product_category: 3, name: "Electrónica", created_at: NOW, updated_at: NOW };

  it("mapea id_product_category y name correctamente", () => {
    const dto = new ProductCategoryResponseDTO(data);
    expect(dto.id_product_category).toBe(3);
    expect(dto.name).toBe("Electrónica");
    expect(dto.id).toBe(3);
  });

  it("static map() y mapList() funcionan", () => {
    expect(ProductCategoryResponseDTO.map(data)).toBeInstanceOf(ProductCategoryResponseDTO);
    const list = ProductCategoryResponseDTO.mapList([data, { ...data, id_product_category: 4 }]);
    expect(list).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCT REVIEW
// ═══════════════════════════════════════════════════════════════════════════════

describe("CreateProductReviewDTO", () => {
  it("acepta rating y comment válidos", () => {
    const result = CreateProductReviewDTO.safeParse({ rating: 4, comment: "Muy bueno" });
    expect(result.success).toBe(true);
  });

  it("falla cuando falta rating", () => {
    const result = CreateProductReviewDTO.safeParse({});
    expect(result.success).toBe(false);
  });

  it("falla cuando rating < 1", () => {
    const result = CreateProductReviewDTO.safeParse({ rating: 0 });
    expect(result.success).toBe(false);
  });

  it("falla cuando rating > 5", () => {
    const result = CreateProductReviewDTO.safeParse({ rating: 6 });
    expect(result.success).toBe(false);
  });

  it("acepta comment null", () => {
    const result = CreateProductReviewDTO.safeParse({ rating: 5, comment: null });
    expect(result.success).toBe(true);
  });

  it("acepta rating exactamente 1 y 5", () => {
    expect(CreateProductReviewDTO.safeParse({ rating: 1 }).success).toBe(true);
    expect(CreateProductReviewDTO.safeParse({ rating: 5 }).success).toBe(true);
  });
});

describe("UpdateProductReviewDTO", () => {
  it("acepta actualización parcial con rating", () => {
    const result = UpdateProductReviewDTO.safeParse({ rating: 3 });
    expect(result.success).toBe(true);
  });

  it("falla cuando no se envía ningún campo", () => {
    const result = UpdateProductReviewDTO.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("FilterProductReviewDTO", () => {
  it("acepta objeto vacío con defaults", () => {
    const result = FilterProductReviewDTO.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data.page).toBe(1);
    expect(result.data.limit).toBe(10);
  });

  it("transforma approved 'true' a boolean", () => {
    const result = FilterProductReviewDTO.safeParse({ approved: "true" });
    expect(result.success).toBe(true);
    expect(result.data.approved).toBe(true);
  });

  it("falla cuando minRating > maxRating (superRefine)", () => {
    const result = FilterProductReviewDTO.safeParse({ minRating: "4", maxRating: "2" });
    expect(result.success).toBe(false);
    const messages = result.error.issues.map((i) => i.message);
    expect(messages.some((m) => m.includes("minRating"))).toBe(true);
  });

  it("acepta minRating igual a maxRating", () => {
    const result = FilterProductReviewDTO.safeParse({ minRating: "3", maxRating: "3" });
    expect(result.success).toBe(true);
  });
});

describe("ProductReviewResponseDTO", () => {
  const data = {
    id_product_review: 1, fk_product: 2, fk_user: 3, rating: 5,
    comment: "Excelente", approved: true,
    user: { name: "Carlos" }, created_at: NOW, updated_at: NOW,
  };

  it("mapea todos los campos correctamente", () => {
    const dto = new ProductReviewResponseDTO(data);
    expect(dto.id_product_review).toBe(1);
    expect(dto.fk_product).toBe(2);
    expect(dto.rating).toBe(5);
    expect(dto.customer_name).toBe("Carlos");
    expect(dto.is_verified).toBe(true);
    expect(dto.comment).toBe("Excelente");
  });

  it("comment es null cuando no se provee", () => {
    const dto = new ProductReviewResponseDTO({ ...data, comment: undefined });
    expect(dto.comment).toBeNull();
  });

  it("customer_name es '' cuando user no tiene nombre", () => {
    const dto = new ProductReviewResponseDTO({ ...data, user: undefined });
    expect(dto.customer_name).toBe("");
  });

  it("is_verified es false cuando approved no se provee", () => {
    const dto = new ProductReviewResponseDTO({ ...data, approved: undefined });
    expect(dto.is_verified).toBe(false);
  });

  it("static map() y mapList() funcionan", () => {
    expect(ProductReviewResponseDTO.map(data)).toBeInstanceOf(ProductReviewResponseDTO);
    const list = ProductReviewResponseDTO.mapList([data]);
    expect(list).toHaveLength(1);
  });
});

describe("ProductReviewsWithStatsResponseDTO", () => {
  it("asigna stats, pagination y reviews", () => {
    const dto = new ProductReviewsWithStatsResponseDTO({
      stats: { avg: 4.5 },
      pagination: { page: 1 },
      reviews: [{ id: 1 }],
    });
    expect(dto.stats).toEqual({ avg: 4.5 });
    expect(dto.pagination).toEqual({ page: 1 });
    expect(dto.reviews).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCT TAG
// ═══════════════════════════════════════════════════════════════════════════════

describe("CreateProductTagDTO", () => {
  it("acepta nombre válido", () => {
    const result = CreateProductTagDTO.safeParse({ name: "gaming" });
    expect(result.success).toBe(true);
  });

  it("falla cuando falta name", () => {
    const result = CreateProductTagDTO.safeParse({});
    expect(result.success).toBe(false);
  });

  it("falla cuando name supera 20 caracteres", () => {
    const result = CreateProductTagDTO.safeParse({ name: "x".repeat(21) });
    expect(result.success).toBe(false);
  });
});

describe("UpdateProductTagDTO", () => {
  it("acepta name actualizado", () => {
    const result = UpdateProductTagDTO.safeParse({ name: "nuevo" });
    expect(result.success).toBe(true);
  });

  it("falla cuando no se envía ningún campo", () => {
    const result = UpdateProductTagDTO.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("FilterProductTagDTO", () => {
  it("acepta objeto vacío con defaults", () => {
    const result = FilterProductTagDTO.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data.page).toBe(1);
    expect(result.data.limit).toBe(10);
  });
});

describe("ProductTagResponseDTO", () => {
  const data = { id_product_tag: 1, name: "gaming", created_at: NOW, updated_at: NOW };

  it("mapea id_product_tag y name", () => {
    const dto = new ProductTagResponseDTO(data);
    expect(dto.id_product_tag).toBe(1);
    expect(dto.name).toBe("gaming");
    expect(dto.id).toBe(1);
  });

  it("static map() y mapList() funcionan", () => {
    expect(ProductTagResponseDTO.map(data)).toBeInstanceOf(ProductTagResponseDTO);
    expect(ProductTagResponseDTO.mapList([data])).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// STORE CATEGORY
// ═══════════════════════════════════════════════════════════════════════════════

describe("CreateStoreCategoryDTO", () => {
  it("acepta nombre válido", () => {
    const result = CreateStoreCategoryDTO.safeParse({ name: "Tecnología" });
    expect(result.success).toBe(true);
  });

  it("falla cuando falta name", () => {
    const result = CreateStoreCategoryDTO.safeParse({});
    expect(result.success).toBe(false);
  });

  it("falla cuando name supera 100 caracteres", () => {
    const result = CreateStoreCategoryDTO.safeParse({ name: "x".repeat(101) });
    expect(result.success).toBe(false);
  });
});

describe("UpdateStoreCategoryDTO", () => {
  it("acepta name actualizado", () => {
    const result = UpdateStoreCategoryDTO.safeParse({ name: "Moda" });
    expect(result.success).toBe(true);
  });

  it("falla cuando no se envía ningún campo", () => {
    const result = UpdateStoreCategoryDTO.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("FilterStoreCategoryDTO", () => {
  it("acepta objeto vacío con defaults", () => {
    const result = FilterStoreCategoryDTO.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data.page).toBe(1);
    expect(result.data.limit).toBe(10);
  });
});

describe("StoreCategoryResponseDTO", () => {
  const data = { id_store_category: 2, name: "Tecnología", created_at: NOW, updated_at: NOW };

  it("mapea id_store_category y name", () => {
    const dto = new StoreCategoryResponseDTO(data);
    expect(dto.id_store_category).toBe(2);
    expect(dto.name).toBe("Tecnología");
    expect(dto.id).toBe(2);
  });

  it("static map() y mapList() funcionan", () => {
    expect(StoreCategoryResponseDTO.map(data)).toBeInstanceOf(StoreCategoryResponseDTO);
    expect(StoreCategoryResponseDTO.mapList([data, { ...data, id_store_category: 3 }])).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SHIPPING ZONE
// ═══════════════════════════════════════════════════════════════════════════════

describe("CreateShippingZoneDTO", () => {
  it("acepta datos válidos", () => {
    const result = CreateShippingZoneDTO.safeParse({ fk_store: 1, base_price: 2000, distance_price: 500 });
    expect(result.success).toBe(true);
  });

  it("falla cuando falta fk_store", () => {
    const result = CreateShippingZoneDTO.safeParse({ base_price: 2000, distance_price: 500 });
    expect(result.success).toBe(false);
  });

  it("falla cuando base_price es negativo", () => {
    const result = CreateShippingZoneDTO.safeParse({ fk_store: 1, base_price: -1, distance_price: 500 });
    expect(result.success).toBe(false);
  });

  it("acepta base_price = 0", () => {
    const result = CreateShippingZoneDTO.safeParse({ fk_store: 1, base_price: 0, distance_price: 0 });
    expect(result.success).toBe(true);
  });
});

describe("UpdateShippingZoneDTO", () => {
  it("acepta actualización parcial de base_price", () => {
    const result = UpdateShippingZoneDTO.safeParse({ base_price: 3000 });
    expect(result.success).toBe(true);
  });

  it("falla cuando no se envía ningún campo", () => {
    const result = UpdateShippingZoneDTO.safeParse({});
    expect(result.success).toBe(false);
  });

  it("falla cuando distance_price es negativo", () => {
    const result = UpdateShippingZoneDTO.safeParse({ distance_price: -100 });
    expect(result.success).toBe(false);
  });
});

describe("FilterShippingZoneDTO", () => {
  it("acepta objeto vacío con defaults", () => {
    const result = FilterShippingZoneDTO.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data.page).toBe(1);
    expect(result.data.limit).toBe(10);
  });

  it("transforma fk_store de string a número", () => {
    const result = FilterShippingZoneDTO.safeParse({ fk_store: "3" });
    expect(result.success).toBe(true);
    expect(result.data.fk_store).toBe(3);
  });
});

describe("ShippingZoneResponseDTO", () => {
  const data = { id_shipping_zone: 1, fk_store: 2, base_price: "2000.00", distance_price: "500.00", created_at: NOW, updated_at: NOW };

  it("mapea y convierte precios a número", () => {
    const dto = new ShippingZoneResponseDTO(data);
    expect(dto.id_shipping_zone).toBe(1);
    expect(dto.fk_store).toBe(2);
    expect(dto.base_price).toBe(2000);
    expect(dto.distance_price).toBe(500);
    expect(typeof dto.base_price).toBe("number");
    expect(dto.id).toBe(1);
  });

  it("static map() y mapList() funcionan", () => {
    expect(ShippingZoneResponseDTO.map(data)).toBeInstanceOf(ShippingZoneResponseDTO);
    expect(ShippingZoneResponseDTO.mapList([data])).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// COLLECTION
// ═══════════════════════════════════════════════════════════════════════════════

describe("CreateCollectionDTO", () => {
  it("acepta datos válidos mínimos", () => {
    const result = CreateCollectionDTO.safeParse({ fk_store: 1, title: "Novedades" });
    expect(result.success).toBe(true);
  });

  it("productIds es array vacío por defecto", () => {
    const result = CreateCollectionDTO.safeParse({ fk_store: 1, title: "Novedades" });
    expect(result.success).toBe(true);
    expect(result.data.productIds).toEqual([]);
  });

  it("acepta productIds con IDs válidos", () => {
    const result = CreateCollectionDTO.safeParse({ fk_store: 1, title: "Novedades", productIds: [1, 2, 3] });
    expect(result.success).toBe(true);
    expect(result.data.productIds).toEqual([1, 2, 3]);
  });

  it("falla cuando falta fk_store", () => {
    const result = CreateCollectionDTO.safeParse({ title: "Novedades" });
    expect(result.success).toBe(false);
  });

  it("falla cuando title está vacío", () => {
    const result = CreateCollectionDTO.safeParse({ fk_store: 1, title: "" });
    expect(result.success).toBe(false);
  });

  it("falla cuando title supera 100 caracteres", () => {
    const result = CreateCollectionDTO.safeParse({ fk_store: 1, title: "x".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("acepta description null", () => {
    const result = CreateCollectionDTO.safeParse({ fk_store: 1, title: "Col", description: null });
    expect(result.success).toBe(true);
  });
});

describe("UpdateCollectionDTO", () => {
  it("acepta actualización parcial con solo title", () => {
    const result = UpdateCollectionDTO.safeParse({ title: "Nuevo título" });
    expect(result.success).toBe(true);
  });

  it("falla cuando no se envía ningún campo", () => {
    const result = UpdateCollectionDTO.safeParse({});
    expect(result.success).toBe(false);
  });

  it("acepta description null", () => {
    const result = UpdateCollectionDTO.safeParse({ description: null });
    expect(result.success).toBe(true);
  });
});

describe("FilterCollectionDTO", () => {
  it("acepta objeto vacío con defaults", () => {
    const result = FilterCollectionDTO.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data.page).toBe(1);
    expect(result.data.limit).toBe(10);
  });

  it("transforma fk_store de string a número", () => {
    const result = FilterCollectionDTO.safeParse({ fk_store: "2" });
    expect(result.success).toBe(true);
    expect(result.data.fk_store).toBe(2);
  });
});

describe("CollectionResponseDTO", () => {
  const data = { id_collection: 1, fk_store: 2, title: "Novedades", description: "Desc", created_at: NOW, updated_at: NOW };

  it("mapea todos los campos correctamente", () => {
    const dto = new CollectionResponseDTO(data);
    expect(dto.id_collection).toBe(1);
    expect(dto.fk_store).toBe(2);
    expect(dto.title).toBe("Novedades");
    expect(dto.description).toBe("Desc");
    expect(dto.id).toBe(1);
  });

  it("description es null cuando no se provee", () => {
    const dto = new CollectionResponseDTO({ ...data, description: undefined });
    expect(dto.description).toBeNull();
  });

  it("static map() y mapList() funcionan", () => {
    expect(CollectionResponseDTO.map(data)).toBeInstanceOf(CollectionResponseDTO);
    expect(CollectionResponseDTO.mapList([data, { ...data, id_collection: 2 }])).toHaveLength(2);
  });
});