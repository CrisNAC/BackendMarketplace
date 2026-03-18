import { ValidationError } from "./errors.js";

export const parsePositiveInteger = (value, fieldName) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ValidationError(`${fieldName} debe ser un entero mayor a 0`);
  }
  return parsed;
};