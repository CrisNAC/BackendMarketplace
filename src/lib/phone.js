/** Teléfono local (ej. Paraguay): exactamente 10 dígitos, sin + ni separadores. */
export const DELIVERY_PHONE_REGEX = /^\d{10}$/;

export const DELIVERY_PHONE_MESSAGE =
  "El teléfono debe tener exactamente 10 dígitos numéricos (sin espacios, guiones ni +)";

export const validateDeliveryPhone = (phone) => {
  const normalized = String(phone ?? "").trim();

  if (!DELIVERY_PHONE_REGEX.test(normalized)) {
    throw {
      status: 400,
      message: DELIVERY_PHONE_MESSAGE,
    };
  }

  return normalized;
};
