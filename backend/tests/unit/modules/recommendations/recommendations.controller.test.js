import { describe, expect, it, jest, beforeEach } from "@jest/globals";

jest.mock("#modules/recommendations/recommendations.service.js");
import * as recommendationsService from "#modules/recommendations/recommendations.service.js";
import * as recommendationsController from "#modules/recommendations/recommendations.controller.js";

describe("Recommendations Controller", () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      params: { recommendationId: "rec-123" },
      awsAccount: { id: "internal-acc-123" },
      userId: "user-1",
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe("getRecommendations", () => {
    it("Should fetch from service, format for UI, and return 200", async () => {
      const rawMockData = [
        {
          recommendation_id: "1",
          estimated_monthly_savings: "50.11",
          resource_type: "ec2_instance",
        },
      ];

      recommendationsService.getRecommendations.mockResolvedValue(rawMockData);

      await recommendationsController.getRecommendations(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);

      // Ensure the formatter was applied before sending
      const sentData = res.send.mock.calls[0][0];
      expect(sentData.recommendations[0].estimated_monthly_savings).toBe(50.11);
      expect(sentData.recommendations[0].resource_type_display).toBe(
        "EC2 Instance",
      );
    });
  });

  describe("implementRecommendation", () => {
    it("Should pass recommendationId and format result", async () => {
      const mockResult = {
        message: "Success",
        recommendation: { estimated_monthly_savings: "10.50" },
      };
      recommendationsService.implementRecommendation.mockResolvedValue(
        mockResult,
      );

      await recommendationsController.implementRecommendation(req, res, next);

      expect(
        recommendationsService.implementRecommendation,
      ).toHaveBeenCalledWith(req.awsAccount, "rec-123", "user-1");

      const sentData = res.send.mock.calls[0][0];
      expect(sentData.recommendation.estimated_monthly_savings).toBe(10.5);
    });
  });
});
