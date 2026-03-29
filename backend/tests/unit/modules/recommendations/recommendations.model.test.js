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
      // cost_data meta for resource upsert, resource INSERT, pending check, UPDATE
      pool.query.mockResolvedValueOnce({
        rows: [{ product_code: "AmazonEC2", region: "us-east-1" }],
      });
      pool.query.mockResolvedValueOnce({ rowCount: 1 });
      pool.query.mockResolvedValueOnce({
        rows: [{ recommendation_id: "existing-id" }],
      });
      pool.query.mockResolvedValueOnce({ rowCount: 1 });

      await recommendationsModel.upsertRecommendation({
        aws_account_id: "acc-1",
        resource_id: "i-123",
        recommendation_type: "Rightsize",
        description: "Test update",
      });

      expect(pool.query).toHaveBeenCalledTimes(4);
      expect(pool.query.mock.calls[2][0]).toContain(
        "SELECT recommendation_id FROM recommendations",
      );
      expect(pool.query.mock.calls[3][0]).toContain("UPDATE recommendations");
      expect(pool.query.mock.calls[3][1]).toContain("existing-id"); // ensure it targets the right ID
    });

    it("Should INSERT if no pending recommendation exists", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      pool.query.mockResolvedValueOnce({ rowCount: 1 });
      pool.query.mockResolvedValueOnce({ rows: [] });
      pool.query.mockResolvedValueOnce({ rowCount: 1 });

      await recommendationsModel.upsertRecommendation({
        aws_account_id: "acc-1",
        resource_id: "i-123",
        recommendation_type: "Rightsize",
      });

      expect(pool.query).toHaveBeenCalledTimes(4);
      expect(pool.query.mock.calls[3][0]).toContain(
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
