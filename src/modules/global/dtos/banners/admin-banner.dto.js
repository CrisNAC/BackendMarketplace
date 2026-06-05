import { z } from "zod";

const dateString = z.string().superRefine((val, ctx) => {
  const result = z.coerce.date().safeParse(val);
  if (!result.success) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "debe ser una fecha válida"
    });
  }
});

export const AdminCreateBannerDTO = z.object({
  title: z.string().trim().min(1, "title es requerido").max(120, "title no puede superar 120 caracteres"),
  description: z.string().trim().max(500, "description no puede superar 500 caracteres").nullable().optional(),
  imageUrl: z.string().trim().min(1, "imageUrl es requerido").max(500, "imageUrl no puede superar 500 caracteres"),
  linkUrl: z.string().trim().max(500, "linkUrl no puede superar 500 caracteres").nullable().optional(),
  startAt: dateString,
  endAt: z.union([z.literal(null), z.literal(""), dateString]).optional(),
  isActive: z.boolean().optional()
}).refine(
  (data) => {
    if (!data.endAt || data.endAt === null || data.endAt === "") return true;
    return new Date(data.endAt) >= new Date(data.startAt);
  },
  {
    message: "endAt no puede ser anterior a startAt",
    path: ["endAt"]
  }
);

export const AdminUpdateBannerDTO = z.object({
  title: z.string().trim().min(1, "title es requerido").max(120, "title no puede superar 120 caracteres").optional(),
  description: z.string().trim().max(500, "description no puede superar 500 caracteres").nullable().optional(),
  imageUrl: z.string().trim().min(1, "imageUrl es requerido").max(500, "imageUrl no puede superar 500 caracteres").optional(),
  linkUrl: z.string().trim().max(500, "linkUrl no puede superar 500 caracteres").nullable().optional(),
  startAt: dateString.optional(),
  endAt: z.union([z.literal(null), z.literal(""), dateString]).optional(),
  isActive: z.boolean().optional()
}).refine(
  (data) => {
    if (!data.endAt || data.endAt === null || data.endAt === "") return true;
    if (!data.startAt) return true;
    return new Date(data.endAt) >= new Date(data.startAt);
  },
  {
    message: "endAt no puede ser anterior a startAt",
    path: ["endAt"]
  }
);

export const AdminToggleBannerActiveDTO = z.object({
  isActive: z.boolean()
});
