import { describe, expect, it, jest } from "@jest/globals";

// Mock the controller to avoid importing real logic during route tests
jest.mock("#modules/anomaly/anomaly.controller.js", () => ({
  getAnomalies: jest.fn(),
  triggerAnalysis: jest.fn(),
  dismissAnomaly: jest.fn(),
  resolveAnomaly: jest.fn(),
}));

import { anomalyRoutes } from "#modules/anomaly/anomaly.route.js";

describe("Anomaly Routes", () => {
  it("Should be configured as an Express Router", () => {
    // Express Router() returns a callable function named 'router' with a stack array
    expect(typeof anomalyRoutes).toBe("function");
    expect(anomalyRoutes.name).toBe("router");
    expect(Array.isArray(anomalyRoutes.stack)).toBe(true);
  });

  it("Should have the correct routes defined", () => {
    const routes = anomalyRoutes.stack.map((layer) => ({
      path: layer.route.path,
      method: Object.keys(layer.route.methods)[0],
    }));

    expect(routes).toContainEqual({ path: "/", method: "get" });
    expect(routes).toContainEqual({ path: "/analyze", method: "post" });
    expect(routes).toContainEqual({ path: "/:anomalyId/dismiss", method: "patch" });
    expect(routes).toContainEqual({ path: "/:anomalyId/resolve", method: "patch" });
  });
});
