import { expect } from "vitest";

export function expectValidationError(res, field) {
  expect(res.status).toBe(400);
  expect(res.body.message).toBe("Error de validación");
  if (field) {
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field })])
    );
  } else {
    expect(res.body.errors?.length).toBeGreaterThan(0);
  }
}
