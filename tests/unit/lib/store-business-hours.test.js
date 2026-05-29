import { describe, it, expect } from "vitest";
import {
  computeStoreAvailability,
  getMondayBasedDayOfWeek,
  parseTimeToMinutes,
} from "../../../src/lib/store-business-hours.js";

/** Lunes 18-may-2026 10:00 en America/Asuncion (UTC-3) */
const MONDAY_10AM_ASUNCION_UTC = new Date("2026-05-18T13:00:00.000Z");

/** Lunes 18-may-2026 20:00 en America/Asuncion (UTC-3) */
const MONDAY_8PM_ASUNCION_UTC = new Date("2026-05-18T23:00:00.000Z");

describe("store-business-hours helpers", () => {
  it("parseTimeToMinutes valida formato HH:mm", () => {
    expect(parseTimeToMinutes("09:30")).toBe(570);
    expect(parseTimeToMinutes("25:00")).toBeNull();
    expect(parseTimeToMinutes("9:30")).toBeNull();
    expect(parseTimeToMinutes("09:30abc")).toBeNull();
  });

  it("getMondayBasedDayOfWeek mapea domingo a 6", () => {
    const sunday = new Date(Date.UTC(2026, 4, 17, 12, 0, 0));
    expect(getMondayBasedDayOfWeek(sunday)).toBe(6);
  });

  it("computeStoreAvailability devuelve abierto dentro del rango", () => {
    const schedules = [
      {
        day_of_week: 0,
        is_closed: false,
        open_time: "08:00",
        close_time: "18:00",
      },
    ];

    const result = computeStoreAvailability(schedules, MONDAY_10AM_ASUNCION_UTC);
    expect(result.is_open).toBe(true);
    expect(result.close_time).toBe("18:00");
  });

  it("computeStoreAvailability devuelve cerrado fuera del rango", () => {
    const schedules = [
      {
        day_of_week: 0,
        is_closed: false,
        open_time: "08:00",
        close_time: "18:00",
      },
    ];

    const result = computeStoreAvailability(schedules, MONDAY_8PM_ASUNCION_UTC);
    expect(result.is_open).toBe(false);
  });

  it("computeStoreAvailability usa hora local del comercio (no UTC del servidor)", () => {
    const noonAsuncionUtc = new Date("2026-05-29T15:00:00.000Z");
    const schedules = [
      {
        day_of_week: 4,
        is_closed: false,
        open_time: "08:00",
        close_time: "13:00",
      },
    ];

    const result = computeStoreAvailability(schedules, noonAsuncionUtc);
    expect(result.is_open).toBe(true);
  });

  it("computeStoreAvailability respeta dia cerrado", () => {
    const schedules = [
      {
        day_of_week: 0,
        is_closed: true,
        open_time: null,
        close_time: null,
      },
    ];

    const result = computeStoreAvailability(schedules, MONDAY_10AM_ASUNCION_UTC);
    expect(result.is_open).toBe(false);
  });
});
