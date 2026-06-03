import { z } from "zod";

export const CreateCategoryRequestDTO = z.object({
  name: z.string({ error: "name es requerido" }).trim().min(1, "name no puede estar vacío").max(100, "name no puede superar 100 caracteres")
});
