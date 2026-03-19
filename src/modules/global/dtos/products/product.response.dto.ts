import { BaseResponseDTO } from "../base/base.response.dto.js";

// ─── NESTED DTOs ─────────────────────────────────────────────────
export class ProductCategoryNestedDTO {
  id_product_category: number;
  name: string;

  constructor(data: any) {
    this.id_product_category = data.id_product_category;
    this.name = data.name;
  }
}

export class ProductTagNestedDTO {
  id_product_tag: number;
  name: string;

  constructor(data: any) {
    this.id_product_tag = data.id_product_tag;
    this.name = data.name;
  }
}

// ─── PRODUCT RESPONSE DTO ────────────────────────────────────────
export class ProductResponseDTO extends BaseResponseDTO {
  id_product: number;
  name: string;
  description: string | null;
  price: number;
  quantity: number | null;
  visible: boolean;
  fk_store: number;
  product_category: ProductCategoryNestedDTO | null;
  tags: ProductTagNestedDTO[];

  constructor(data: any) {
    super({
      id: data.id_product,
      created_at: data.created_at,
      updated_at: data.updated_at
    });
    this.id_product = data.id_product;
    this.name = data.name;
    this.description = data.description ?? null;
    this.price = Number(data.price);
    this.quantity = data.quantity ?? null;
    this.visible = data.visible;
    this.fk_store = data.fk_store;
    this.product_category = data.product_category
      ? new ProductCategoryNestedDTO(data.product_category)
      : null;
    this.tags =
      data.product_tag_relations?.map(
        (r: any) => new ProductTagNestedDTO(r.product_tag)
      ) ?? [];
    // status excluido intencionalmente
  }

  static map(data: any): ProductResponseDTO {
    return new ProductResponseDTO(data);
  }

  static mapList(data: any[]): ProductResponseDTO[] {
    return data.map(ProductResponseDTO.map);
  }
}

// ─── PRODUCT WITH REVIEWS STATS ──────────────────────────────────
// Usado en GET /products/:id
export class ProductDetailResponseDTO extends ProductResponseDTO {
  average_rating: number | null;
  review_count: number;

  constructor(data: any, averageRating: number | null, reviewCount: number) {
    super(data);
    this.average_rating = averageRating;
    this.review_count = reviewCount;
  }

  static mapWithStats(
    data: any,
    averageRating: number | null,
    reviewCount: number
  ): ProductDetailResponseDTO {
    return new ProductDetailResponseDTO(data, averageRating, reviewCount);
  }
}
