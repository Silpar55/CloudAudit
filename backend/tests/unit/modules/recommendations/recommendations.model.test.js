import { describe, expect, it, jest, beforeEach } from "@jest/globals";

jest.mock("#config", () => ({
  pool: { query: jest.fn() },
}));

import { pool } from "#config";
import * as recommendationsModel from "#modules/recommendations/recommendations.model.js";

describe("Recommendations Model", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getRecommendationsByInternalId", () => {
    it("Should query by internalAccountId", async () => {
      pool.query.mockResolvedValue({ rows: [{ recommendation_id: "1" }] });
      const result =
        await recommendationsModel.getRecommendationsByInternalId("acc-123");

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE aws_account_id = $1"),
        ["acc-123"],
      );
      expect(result).toHaveLength(1);
    });
  });

  describe("upsertRecommendation", () => {
    it("Should UPDATE if a pending recommendation already exists", async () => {
      // Mock the initial SELECT check returning an existing row
      pool.query.mockResolvedValueOnce({
        rows: [{ recommendation_id: "existing-id" }],
      });
      // Mock the UPDATE
      pool.query.mockResolvedValueOnce({ rowCount: 1 });

      await recommendationsModel.upsertRecommendation({
        aws_account_id: "acc-1",
        resource_id: "i-123",
        recommendation_type: "Rightsize",
        description: "Test update",
      });

      // 1st query is SELECT, 2nd is UPDATE
      expect(pool.query).toHaveBeenCalledTimes(2);
      expect(pool.query.mock.calls[1][0]).toContain("UPDATE recommendations");
      expect(pool.query.mock.calls[1][1]).toContain("existing-id"); // ensure it targets the right ID
    });

    it("Should INSERT if no pending recommendation exists", async () => {
      // Mock the initial SELECT returning empty
      pool.query.mockResolvedValueOnce({ rows: [] });
      // Mock the INSERT
      pool.query.mockResolvedValueOnce({ rowCount: 1 });

      await recommendationsModel.upsertRecommendation({
        aws_account_id: "acc-1",
        resource_id: "i-123",
        recommendation_type: "Rightsize",
      });

      expect(pool.query).toHaveBeenCalledTimes(2);
      expect(pool.query.mock.calls[1][0]).toContain(
        "INSERT INTO recommendations",
      );
    });
  });

  describe("getRecommendationById", () => {
    it("Should require recommendationId and internalAccountId", async () => {
      pool.query.mockResolvedValue({ rows: [{ id: "rec-1" }] });
      await recommendationsModel.getRecommendationById("rec-1", "acc-1");

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining(
          "WHERE recommendation_id = $1 AND aws_account_id = $2",
        ),
        ["rec-1", "acc-1"],
      );
    });
  });
});
