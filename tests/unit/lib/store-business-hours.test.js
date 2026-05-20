import { describe, it, expect } from "vitest";
import {
  computeStoreAvailability,
  getMondayBasedDayOfWeek,
  parseTimeToMinutes,
} from "../../../src/lib/store-business-hours.js";

describe("store-business-hours helpers", () => {
  it("parseTimeToMinutes valida formato HH:mm", () => {
    expect(parseTimeToMinutes("09:30")).toBe(570);
    expect(parseTimeToMinutes("25:00")).toBeNull();
    expect(parseTimeToMinutes("9:30")).toBeNull();
  });

  it("getMondayBasedDayOfWeek mapea domingo a 6", () => {
    const sunday = new Date("2026-05-17T12:00:00");
    expect(getMondayBasedDayOfWeek(sunday)).toBe(6);
  });

  it("computeStoreAvailability devuelve abierto dentro del rango", () => {
    const mondayMorning = new Date("2026-05-18T10:00:00");
    const schedules = [
      {
        day_of_week: 0,
        is_closed: false,
        open_time: "08:00",
        close_time: "18:00",
      },
    ];

    const result = computeStoreAvailability(schedules, mondayMorning);
    expect(result.is_open).toBe(true);
    expect(result.close_time).toBe("18:00");
  });

  it("computeStoreAvailability devuelve cerrado fuera del rango", () => {
    const mondayNight = new Date("2026-05-18T20:00:00");
    const schedules = [
      {
        day_of_week: 0,
        is_closed: false,
        open_time: "08:00",
        close_time: "18:00",
      },
    ];

    const result = computeStoreAvailability(schedules, mondayNight);
    expect(result.is_open).toBe(false);
  });

  it("computeStoreAvailability respeta dia cerrado", () => {
    const mondayMorning = new Date("2026-05-18T10:00:00");
    const schedules = [
      {
        day_of_week: 0,
        is_closed: true,
        open_time: null,
        close_time: null,
      },
    ];

    const result = computeStoreAvailability(schedules, mondayMorning);
    expect(result.is_open).toBe(false);
  });
});
