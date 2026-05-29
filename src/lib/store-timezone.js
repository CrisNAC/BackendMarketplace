/** Zona horaria para horarios de comercio (HH:mm ingresados en hora local). */
export const STORE_TIMEZONE =
  process.env.STORE_TIMEZONE?.trim() || "America/Asuncion";

const WEEKDAY_SHORT_TO_MONDAY_INDEX = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

export const getStoreLocalWeekdayIndex = (date = new Date(), timeZone = STORE_TIMEZONE) => {
  const weekdayShort = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(date);

  const index = WEEKDAY_SHORT_TO_MONDAY_INDEX[weekdayShort];
  return index ?? getMondayBasedDayOfWeekFromUtc(date);
};

/** Fallback si Intl devuelve un valor inesperado (usa calendario del servidor). */
const getMondayBasedDayOfWeekFromUtc = (date) => {
  const jsDay = date.getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
};

export const getStoreLocalMinutesOfDay = (date = new Date(), timeZone = STORE_TIMEZONE) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return date.getHours() * 60 + date.getMinutes();
  }

  return hour * 60 + minute;
};
