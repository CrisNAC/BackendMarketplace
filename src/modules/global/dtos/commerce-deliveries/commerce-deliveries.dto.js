import { z } from "zod";

export const CreateStoreDeliveryDTO = z.object({
  fk_user: z.number({ error: "fk_user es requerido" }).int().positive("fk_user debe ser un ID válido")
});
