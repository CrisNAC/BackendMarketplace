import { z } from "zod";
import { BaseResponseDTO } from "../base/base.response.dto.js";

// ─── REQUEST ─────────────────────────────────────────────────────
export const CreateProductReviewDTO = z.object({
  rating: z
    .number({ error: "rating es requerido" })
    .int("rating debe ser entero")
    .min(1, "rating mínimo es 1")
    .max(5, "rating máximo es 5"),

  comment: z
    .string()
    .max(2000, "comment no puede superar 2000 caracteres")
    .nullable()
    .optional()
});

export type CreateProductReviewDTOType = z.infer<typeof CreateProductReviewDTO>;

export const UpdateProductReviewDTO = z
  .object({
    rating: z
      .number({ error: "rating debe ser número" })
      .int("rating debe ser entero")
      .min(1, "rating mínimo es 1")
      .max(5, "rating máximo es 5")
      .optional(),

    comment: z
      .string()
      .max(2000, "comment no puede superar 2000 caracteres")
      .nullable()
      .optional()
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "Debe enviar al menos un campo para actualizar"
  });

export type UpdateProductReviewDTOType = z.infer<typeof UpdateProductReviewDTO>;

export const FilterProductReviewDTO = z.object({
  fk_product: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive("fk_product debe ser un ID válido"))
    .optional(),

  approved: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),

  minRating: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(1).max(5, "minRating máximo es 5"))
    .optional(),

  maxRating: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(1).max(5, "maxRating máximo es 5"))
    .optional(),

  page: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive("page debe ser mayor a 0"))
    .optional()
    .default(1),

  limit: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(1).max(100, "limit no puede superar 100"))
    .optional()
    .default(10)
}).superRefine((data, ctx) => {
  if (
    data.minRating !== undefined &&
    data.maxRating !== undefined &&
    data.minRating > data.maxRating
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "minRating no puede ser mayor que maxRating",
      path: ["maxRating"]
    });
  }
});

export type FilterProductReviewDTOType = z.infer<typeof FilterProductReviewDTO>;

// ─── RESPONSE ────────────────────────────────────────────────────
export class ProductReviewResponseDTO extends BaseResponseDTO {
  id_product_review: number;
  fk_product: number;
  fk_user: number;
  customer_name: string;
  rating: number;
  comment: string | null;
  is_verified: boolean;

  constructor(data: any) {
    super({
      id: data.id_product_review,
      created_at: data.created_at,
      updated_at: data.updated_at
    });
    this.id_product_review = data.id_product_review;
    this.fk_product = data.fk_product;
    this.fk_user = data.fk_user;
    this.customer_name = data.user?.name ?? "";
    this.rating = data.rating;
    this.comment = data.comment ?? null;
    this.is_verified = data.approved ?? false;
    // status excluido intencionalmente
  }

  static map(data: any): ProductReviewResponseDTO {
    return new ProductReviewResponseDTO(data);
  }

  static mapList(data: any[]): ProductReviewResponseDTO[] {
    return data.map(ProductReviewResponseDTO.map);
  }
}

// ─── REVIEWS CON STATS (GET /products/:id/reviews) ───────────────
export class ProductReviewsWithStatsResponseDTO {
  stats: {
    average_rating: number | null;
    total_reviews: number;
    verified_reviews: number;
  };
  pagination: {
    page: number;
    limit: number;
    total_reviews: number;
    total_pages: number;
  };
  reviews: ProductReviewResponseDTO[];

  constructor(data: {
    stats: { average_rating: number | null; total_reviews: number; verified_reviews: number };
    pagination: { page: number; limit: number; total_reviews: number; total_pages: number };
    reviews: any[];
  }) {
    this.stats = data.stats;
    this.pagination = data.pagination;
    this.reviews = ProductReviewResponseDTO.mapList(data.reviews);
  }
}
