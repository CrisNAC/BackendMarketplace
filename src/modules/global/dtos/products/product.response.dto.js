import { BaseResponseDTO } from "../base/base.response.dto.js";

// ─── NESTED DTOs ─────────────────────────────────────────────────
export class ProductCategoryNestedDTO {
  constructor(data) {
    this.id = data.id ?? data.id_category;
    this.name = data.name;
  }
}

export class ProductTagNestedDTO {
  constructor(data) {
    this.id_product_tag = data.id_product_tag;
    this.name = data.name;
  }
}

// ─── PRODUCT RESPONSE DTO ────────────────────────────────────────
export class ProductResponseDTO extends BaseResponseDTO {
  constructor(data) {
    super({
      id: data.id_product,
      created_at: data.created_at,
      updated_at: data.updated_at
    });
    this.id_product = data.id_product;
    this.name = data.name;
    this.description = data.description ?? null;
    this.originalPrice = Number(data.price);
    this.offerPrice =
      data.offer_price === null || data.offer_price === undefined
        ? null
        : Number(data.offer_price);
    this.isOffer = Boolean(data.is_offer);
    this.price =
      this.isOffer && this.offerPrice !== null
        ? this.offerPrice
        : this.originalPrice;
    this.quantity = data.quantity ?? null;
    this.visible = data.visible;
    this.fk_store = data.fk_store;
    const primaryCategory = data.category ?? null;
    const categoriesSource = Array.isArray(data.categories)
      ? data.categories
      : Array.isArray(data.product_categories)
        ? data.product_categories.map((relation) => relation.category ?? relation)
        : [];
    this.category = primaryCategory
      ? new ProductCategoryNestedDTO(primaryCategory)
      : null;
    this.categories = categoriesSource
      .filter((category) => category && (category.id_category || category.id))
      .map((category) => new ProductCategoryNestedDTO(category));
    this.tags =
      data.product_tag_relations?.map(
        (r) => new ProductTagNestedDTO(r.product_tag)
      ) ?? [];
  }

  static map(data) {
    return new ProductResponseDTO(data);
  }

  static mapList(data) {
    return data.map(ProductResponseDTO.map);
  }
}

// ─── PRODUCT WITH REVIEWS STATS ──────────────────────────────────
export class ProductDetailResponseDTO extends ProductResponseDTO {
  constructor(data, averageRating, reviewCount) {
    super(data);
    this.average_rating = averageRating;
    this.review_count = reviewCount;
  }

  static mapWithStats(data, averageRating, reviewCount) {
    return new ProductDetailResponseDTO(data, averageRating, reviewCount);
  }
}