export const WEEKDAY_LABELS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Convierte Date.getDay() (0=Domingo) a índice 0=Lunes ... 6=Domingo */
export const getMondayBasedDayOfWeek = (date = new Date()) => {
  const jsDay = date.getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
};

export const parseTimeToMinutes = (timeValue) => {
  if (typeof timeValue !== "string" || !TIME_REGEX.test(timeValue.trim())) {
    return null;
  }

  const [hours, minutes] = timeValue.trim().split(":").map(Number);
  return hours * 60 + minutes;
};

export const formatMinutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

export const mapBusinessHoursRecord = (record) => ({
  day_of_week: record.day_of_week,
  day_label: WEEKDAY_LABELS[record.day_of_week] ?? `Día ${record.day_of_week}`,
  open_time: record.open_time,
  close_time: record.close_time,
  is_closed: Boolean(record.is_closed),
});

export const computeStoreAvailability = (schedules = [], referenceDate = new Date()) => {
  const todayIndex = getMondayBasedDayOfWeek(referenceDate);
  const todaySchedule = schedules.find((item) => item.day_of_week === todayIndex);

  if (!todaySchedule || todaySchedule.is_closed) {
    return {
      is_open: false,
      close_time: null,
      open_time: null,
      day_of_week: todayIndex,
    };
  }

  const openMinutes = parseTimeToMinutes(todaySchedule.open_time);
  const closeMinutes = parseTimeToMinutes(todaySchedule.close_time);

  if (
    openMinutes === null ||
    closeMinutes === null ||
    openMinutes >= closeMinutes
  ) {
    return {
      is_open: false,
      close_time: todaySchedule.close_time ?? null,
      open_time: todaySchedule.open_time ?? null,
      day_of_week: todayIndex,
    };
  }

  const nowMinutes = referenceDate.getHours() * 60 + referenceDate.getMinutes();
  const isOpen = nowMinutes >= openMinutes && nowMinutes < closeMinutes;

  return {
    is_open: isOpen,
    close_time: todaySchedule.close_time ?? null,
    open_time: todaySchedule.open_time ?? null,
    day_of_week: todayIndex,
  };
};
