import { describe, expect, it } from "@jest/globals";
import {
  parseJSONSafe,
  formatCost,
  formatResourceType,
  formatAnomalyForUI,
  formatRecommendationForUI,
} from "#utils/formatters.js";

describe("Formatters Utility", () => {
  describe("parseJSONSafe", () => {
    it("Should parse valid JSON strings", () => {
      expect(parseJSONSafe('{"key":"value"}')).toEqual({ key: "value" });
    });
    it("Should return original string if invalid JSON", () => {
      expect(parseJSONSafe("invalid-json")).toBe("invalid-json");
    });
    it("Should return object as-is if already an object", () => {
      expect(parseJSONSafe({ key: "value" })).toEqual({ key: "value" });
    });
  });

  describe("formatCost", () => {
    it("Should format numbers to 2 decimal places", () => {
      expect(formatCost(10.567)).toBe(10.57);
      expect(formatCost("10")).toBe(10.0);
      expect(formatCost(null)).toBe(0.0);
    });
  });

  describe("formatResourceType", () => {
    it("Should translate known enums", () => {
      expect(formatResourceType("ec2_instance")).toBe("EC2 Instance");
      expect(formatResourceType("rds_instance")).toBe("RDS Database");
    });
    it("Should format unknown enums cleanly", () => {
      expect(formatResourceType("new_aws_service")).toBe("New Aws Service");
    });
  });

  describe("formatRecommendationForUI", () => {
    it("Should format a recommendation correctly", () => {
      const rawRec = {
        recommendation_id: "rec-123",
        estimated_monthly_savings: "100.123",
        resource_type: "ec2_instance",
        confidence_score: "0.85",
        metadata: '{"cpu": 5}',
      };

      const formatted = formatRecommendationForUI(rawRec);

      expect(formatted.estimated_monthly_savings).toBe(100.12);
      expect(formatted.resource_type_display).toBe("EC2 Instance");
      expect(formatted.confidence_score_pct).toBe("85%");
      expect(formatted.metadata).toEqual({ cpu: 5 });
    });
  });
});
