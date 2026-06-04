import { z } from "zod";

export const CreateAssignmentDTO = z.object({
  fk_order: z.number({ error: "fk_order es requerido" }).int().positive("fk_order debe ser un ID válido"),
  fk_delivery: z.number().int().positive("fk_delivery debe ser un ID válido").optional(),
  status: z.boolean().default(true).optional()
});

export const RespondToAssignmentDTO = z.object({
  action: z.enum(["ACCEPT", "REJECT"], {
    error: "action debe ser ACCEPT o REJECT"
  })
});
