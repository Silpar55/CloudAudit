/**
 * CloudAudit — Unit tests for `recommendations.service`.
 * Run from `backend/` with `npm test`.
 */

import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { AppError } from "#utils/helper/AppError.js";

jest.mock("#modules/recommendations/recommendations.model.js");
jest.mock("#modules/anomaly/anomaly.model.js");

import * as recommendationsModel from "#modules/recommendations/recommendations.model.js";
import * as anomalyModel from "#modules/anomaly/anomaly.model.js";
import * as recommendationsService from "#modules/recommendations/recommendations.service.js";

describe("Recommendations Service", () => {
  const mockAccount = { id: "internal-acc-1" };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getRecommendations", () => {
    it("Should return recommendations successfully using internal account ID", async () => {
      const mockRecs = [{ recommendation_id: "1" }];
      recommendationsModel.getRecommendationsByInternalId.mockResolvedValue(
        mockRecs,
      );

      const result =
        await recommendationsService.getRecommendations(mockAccount);

      expect(result).toEqual(mockRecs);
      expect(
        recommendationsModel.getRecommendationsByInternalId,
      ).toHaveBeenCalledWith("internal-acc-1");
    });

    it("Should throw AppError if model fails", async () => {
      recommendationsModel.getRecommendationsByInternalId.mockResolvedValue(
        null,
      );
      await expect(
        recommendationsService.getRecommendations(mockAccount),
      ).rejects.toThrow(AppError);
    });
  });

  describe("runDetectionCycle", () => {
    it("Should execute deterministic and AI engines without crashing", async () => {
      anomalyModel.getAnomaliesByInternalId.mockResolvedValue([]);
      recommendationsModel.getActiveResourcesByService.mockResolvedValue([]);
      recommendationsModel.getOrphanedAnomalies.mockResolvedValue([]);

      const result =
        await recommendationsService.runDetectionCycle(mockAccount);

      expect(result).toHaveProperty("message");
      expect(result.ai_recommendations_generated).toBeDefined();
    });
  });
});
