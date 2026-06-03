import { vi } from "vitest";
import { defineDeliveryRegisterTests } from "../helpers/delivery-register.harness.js";

const deliveryRegisterHarness = vi.hoisted(() => {
  const mockAuthenticate = vi.fn();
  const prisma = {
    users: { findUnique: vi.fn(), update: vi.fn() },
    deliveries: { create: vi.fn() },
    $transaction: vi.fn(async (operations) => {
      if (typeof operations === "function") {
        return operations(prisma);
      }
      return Promise.all(operations);
    }),
  };
  return { mockAuthenticate, prisma };
});

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: deliveryRegisterHarness.prisma,
}));

vi.mock("../../src/config/jwt.config.js", () => ({
  default: deliveryRegisterHarness.mockAuthenticate,
}));

const { default: app } = await import("../../src/app.js");

defineDeliveryRegisterTests(app, deliveryRegisterHarness);
