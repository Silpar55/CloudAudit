import { describe, expect, it, jest, beforeEach } from "@jest/globals";

jest.mock("#config", () => ({
  pool: { query: jest.fn() },
}));

import { pool } from "#config";
import { getAnomaliesByInternalId } from "#modules/anomaly/anomaly.model.js";

describe("Anomaly Model", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAnomaliesByInternalId", () => {
    it("Should return rows on success", async () => {
      const mockRows = [{ anomaly_id: "123", severity: 90 }];
      pool.query.mockResolvedValue({ rows: mockRows });

      const result = await getAnomaliesByInternalId("acc-123");

      expect(pool.query).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockRows);
    });

    it("Should return null on database error", async () => {
      pool.query.mockRejectedValue(new Error("DB Connection Error"));

      const result = await getAnomaliesByInternalId("acc-123");

      expect(pool.query).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
    });
  });
});
