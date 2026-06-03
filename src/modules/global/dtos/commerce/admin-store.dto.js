import { z } from "zod";

export const AdminRejectStoreDTO = z.object({
  reason: z.string().trim().min(1, "El motivo de rechazo es requerido")
});
