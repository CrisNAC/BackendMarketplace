export const STORE_TIMEZONE =
  process.env.STORE_TIMEZONE?.trim() || "America/Asuncion";

const DEFAULT_TIMEZONE = "America/Asuncion";
const FALLBACK_TIMEZONE = "UTC";

const WEEKDAY_SHORT_TO_MONDAY_INDEX = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

/** Valida IANA; si no es válida usa UTC para no romper Intl. */
export const resolveStoreTimeZone = (timeZone = STORE_TIMEZONE) => {
  const candidate = String(timeZone ?? "").trim() || DEFAULT_TIMEZONE;

  try {
    Intl.DateTimeFormat(undefined, { timeZone: candidate });
    return candidate;
  } catch {
    return FALLBACK_TIMEZONE;
  }
};

/** Fallback si Intl devuelve un valor inesperado (usa calendario UTC). */
const getMondayBasedDayOfWeekFromUtc = (date) => {
  const jsDay = date.getUTCDay();
  return jsDay === 0 ? 6 : jsDay - 1;
};

export const getStoreLocalWeekdayIndex = (date = new Date(), timeZone = STORE_TIMEZONE) => {
  const safeTimeZone = resolveStoreTimeZone(timeZone);

  try {
    const weekdayShort = new Intl.DateTimeFormat("en-US", {
      timeZone: safeTimeZone,
      weekday: "short",
    }).format(date);

    const index = WEEKDAY_SHORT_TO_MONDAY_INDEX[weekdayShort];
    if (index !== undefined) {
      return index;
    }
  } catch {
    // fallback abajo
  }

  return getMondayBasedDayOfWeekFromUtc(date);
};

export const getStoreLocalMinutesOfDay = (date = new Date(), timeZone = STORE_TIMEZONE) => {
  const safeTimeZone = resolveStoreTimeZone(timeZone);

  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: safeTimeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(date);

    const hour = Number(parts.find((part) => part.type === "hour")?.value);
    const minute = Number(parts.find((part) => part.type === "minute")?.value);

    if (Number.isFinite(hour) && Number.isFinite(minute)) {
      return hour * 60 + minute;
    }
  } catch {
    // fallback abajo
  }

  return date.getUTCHours() * 60 + date.getUTCMinutes();
};
