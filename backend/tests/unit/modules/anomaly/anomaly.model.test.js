/**
 * CloudAudit — Unit tests for `anomaly.model`.
 * Run from `backend/` with `npm test`.
 */

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
      pool.query
        .mockResolvedValueOnce({ rows: [{ c: 4 }] })
        .mockResolvedValueOnce({ rows: mockRows });

      const result = await getAnomaliesByInternalId("acc-123");

      expect(pool.query).toHaveBeenCalledTimes(2);
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
