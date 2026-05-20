import { prisma } from "../../../../lib/prisma.js";
import {
  WEEKDAY_LABELS,
  computeStoreAvailability,
  mapBusinessHoursRecord,
  parseTimeToMinutes,
} from "../../../../lib/store-business-hours.js";
import { getAuthorizedStoreOwnerService } from "../../commerces/store.service.js";

const BUSINESS_HOURS_SELECT = {
  id_store_business_hour: true,
  fk_store: true,
  day_of_week: true,
  open_time: true,
  close_time: true,
  is_closed: true,
  status: true,
  created_at: true,
  updated_at: true,
};

const parsePositiveInteger = (value, fieldName) => {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw {
      status: 400,
      message: `${fieldName} invalido`,
    };
  }

  return parsedValue;
};

const parseDayOfWeek = (value) => {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue < 0 || parsedValue > 6) {
    throw {
      status: 400,
      message: "day_of_week debe estar entre 0 (Lunes) y 6 (Domingo)",
    };
  }

  return parsedValue;
};

const validateTimeField = (value, fieldName, { required = false } = {}) => {
  if (value === undefined || value === null || value === "") {
    if (required) {
      throw {
        status: 400,
        message: `${fieldName} es requerido`,
      };
    }
    return null;
  }

  const normalizedValue = String(value).trim();
  if (parseTimeToMinutes(normalizedValue) === null) {
    throw {
      status: 400,
      message: `${fieldName} debe tener formato HH:mm`,
    };
  }

  return normalizedValue;
};

const validateScheduleEntry = (entry) => {
  if (!entry || typeof entry !== "object") {
    throw {
      status: 400,
      message: "Cada horario debe ser un objeto valido",
    };
  }

  const dayOfWeek = parseDayOfWeek(entry.day_of_week);
  const isClosed = Boolean(entry.is_closed);

  if (isClosed) {
    return {
      day_of_week: dayOfWeek,
      is_closed: true,
      open_time: null,
      close_time: null,
    };
  }

  const openTime = validateTimeField(entry.open_time, "open_time", { required: true });
  const closeTime = validateTimeField(entry.close_time, "close_time", { required: true });
  const openMinutes = parseTimeToMinutes(openTime);
  const closeMinutes = parseTimeToMinutes(closeTime);

  if (openMinutes >= closeMinutes) {
    throw {
      status: 400,
      message: `El horario de ${WEEKDAY_LABELS[dayOfWeek]} es invalido: open_time debe ser menor que close_time`,
    };
  }

  return {
    day_of_week: dayOfWeek,
    is_closed: false,
    open_time: openTime,
    close_time: closeTime,
  };
};

export const getStoreBusinessHoursRecords = async (storeId) => {
  const rows = await prisma.storeBusinessHours.findMany({
    where: {
      fk_store: storeId,
      status: true,
    },
    orderBy: { day_of_week: "asc" },
    select: BUSINESS_HOURS_SELECT,
  });

  return rows.map(mapBusinessHoursRecord);
};

export const buildStoreBusinessHoursResponse = async (storeId, referenceDate = new Date()) => {
  const schedules = await getStoreBusinessHoursRecords(storeId);
  const availability = computeStoreAvailability(schedules, referenceDate);

  return {
    schedules,
    ...availability,
  };
};

export const getStoreBusinessHoursService = async (storeId) => {
  const parsedStoreId = parsePositiveInteger(storeId, "ID de comercio");

  const store = await prisma.stores.findFirst({
    where: {
      id_store: parsedStoreId,
      status: true,
    },
    select: { id_store: true },
  });

  if (!store) {
    throw {
      status: 404,
      message: "Comercio no encontrado",
    };
  }

  return buildStoreBusinessHoursResponse(parsedStoreId);
};

export const updateStoreBusinessHoursService = async (
  authenticatedUserId,
  storeId,
  payload
) => {
  const store = await getAuthorizedStoreOwnerService(authenticatedUserId, storeId);
  const schedulesPayload = payload?.schedules;

  if (!Array.isArray(schedulesPayload) || schedulesPayload.length === 0) {
    throw {
      status: 400,
      message: "Debe enviar un arreglo schedules con al menos un dia",
    };
  }

  const normalizedSchedules = schedulesPayload.map(validateScheduleEntry);
  const uniqueDays = new Set(normalizedSchedules.map((item) => item.day_of_week));

  if (uniqueDays.size !== normalizedSchedules.length) {
    throw {
      status: 400,
      message: "No puede repetir el mismo day_of_week en schedules",
    };
  }

  await prisma.$transaction(
    normalizedSchedules.map((schedule) =>
      prisma.storeBusinessHours.upsert({
        where: {
          fk_store_day_of_week: {
            fk_store: store.id_store,
            day_of_week: schedule.day_of_week,
          },
        },
        create: {
          fk_store: store.id_store,
          day_of_week: schedule.day_of_week,
          open_time: schedule.open_time,
          close_time: schedule.close_time,
          is_closed: schedule.is_closed,
          status: true,
        },
        update: {
          open_time: schedule.open_time,
          close_time: schedule.close_time,
          is_closed: schedule.is_closed,
          status: true,
        },
      })
    )
  );

  return buildStoreBusinessHoursResponse(store.id_store);
};
