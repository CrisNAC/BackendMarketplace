import { z } from "zod";

export const UpdateBusinessHoursDTO = z.object({
  schedules: z.array(
    z.object({
      day_of_week: z.number().int().min(0, "day_of_week mínimo es 0").max(6, "day_of_week máximo es 6"),
      is_closed: z.boolean(),
      open_time: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "open_time debe tener formato HH:mm").nullable().optional(),
      close_time: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "close_time debe tener formato HH:mm").nullable().optional()
    })
  ).min(1, "Debe enviar al menos un horario")
});
