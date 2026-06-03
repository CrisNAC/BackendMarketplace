import { z } from "zod";

export const CreateProductReportDTO = z.object({
  productId: z.number({ error: "productId es requerido" }).int().positive("productId debe ser un ID válido"),
  reason: z.enum(["DEFECTIVE", "WRONG_ITEM", "MISSING_ITEM", "LATE_DELIVERY", "CUSTOMER_SERVICE", "OTHER"], {
    error: "reason no es válido"
  }),
  description: z.string().max(2000, "description no puede superar 2000 caracteres").nullable().optional()
});

export const UpdateProductReportDTO = z.object({
  report_status: z.enum(["IN_PROGRESS", "RESOLVED", "REJECTED"], {
    error: "report_status debe ser IN_PROGRESS, RESOLVED o REJECTED"
  }),
  notes: z.string().max(2000, "notes no puede superar 2000 caracteres").nullable().optional()
});

export const ResolveProductReportDTO = z.object({
  status: z.enum(["RESOLVED", "REJECTED"], {
    error: "status debe ser RESOLVED o REJECTED"
  }),
  notes: z.string().max(2000, "notes no puede superar 2000 caracteres").nullable().optional()
});
