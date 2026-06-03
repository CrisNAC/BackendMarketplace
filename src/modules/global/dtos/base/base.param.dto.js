import { z } from "zod";

export const IdParamDTO = z.object({
  id: z.string().transform(Number).pipe(z.number().int().positive())
});
