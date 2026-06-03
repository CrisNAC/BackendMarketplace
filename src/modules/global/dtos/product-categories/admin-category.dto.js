import { z } from "zod";

export const AdminCreateCategoryDTO = z.object({
  name: z.string({ message: "El nombre de la categoría no puede estar vacío" })
    .trim()
    .min(1, "El nombre de la categoría no puede estar vacío")
    .max(100, "El nombre de la categoría no puede superar 100 caracteres"),
  icon: z.string().nullable().optional()
});

export const AdminUpdateCategoryDTO = z.object({
  name: z.string().trim().min(1, "name no puede estar vacío").max(100, "name no puede superar 100 caracteres").optional(),
  visible: z.boolean().optional(),
  icon: z.string().nullable().optional()
}).refine(
  (data) => data.name !== undefined || data.visible !== undefined || data.icon !== undefined,
  {
    message: "Debe enviar al menos uno: name, visible o icon"
  }
);

export const AdminCategoryDecisionDTO = z.object({
  decision: z.enum(["approve", "reject"])
});
