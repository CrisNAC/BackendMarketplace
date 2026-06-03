import { z } from "zod";

export const AdminCreateTagDTO = z.object({
  name: z.string({ message: "name no puede estar vacío" })
    .trim()
    .min(1, "name no puede estar vacío")
    .max(20, "name no puede superar 20 caracteres")
});

export const AdminUpdateTagDTO = z.object({
  name: z.string({ message: "name no puede estar vacío" })
    .trim()
    .min(1, "name no puede estar vacío")
    .max(20, "name no puede superar 20 caracteres")
});
