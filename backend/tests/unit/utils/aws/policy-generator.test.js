import { describe, expect, it } from "@jest/globals";
import {
  generateScripts,
  generateReadOnlyAuditPolicy,
  generateCostExplorerPolicy,
} from "#utils/aws/policy-generator.js";

describe("AWS Policy Generator", () => {
  describe("generateScripts", () => {
    it("Should generate trust and permissions policy JSON strings with external ID", () => {
      const pendingAccount = { external_id: "ext-789", externalId: "ext-789" };
      const result = generateScripts(pendingAccount);

      expect(result).toHaveProperty("trustPolicyJson");
      expect(result).toHaveProperty("permissionsPolicyJson");
      expect(result).toHaveProperty("instructions");

      expect(result.trustPolicyJson).toContain("ext-789");
      expect(result.permissionsPolicyJson).toContain("sts:GetCallerIdentity");
      expect(result.instructions.externalId).toBe("ext-789");

      // Verify valid JSON
      expect(() => JSON.parse(result.trustPolicyJson)).not.toThrow();
      expect(() => JSON.parse(result.permissionsPolicyJson)).not.toThrow();
    });
  });

  describe("generateReadOnlyAuditPolicy", () => {
    it("Should return a valid read-only policy object", () => {
      const policy = generateReadOnlyAuditPolicy();

      expect(policy.Version).toBe("2012-10-17");
      expect(policy.Statement[0].Effect).toBe("Allow");
      expect(policy.Statement[0].Action).toContain("ec2:Describe*");
      expect(policy.Statement[0].Resource).toBe("*");
    });
  });

  describe("generateCostExplorerPolicy", () => {
    it("Should return a valid cost explorer policy object", () => {
      const policy = generateCostExplorerPolicy();

      expect(policy.Version).toBe("2012-10-17");
      expect(policy.Statement[0].Effect).toBe("Allow");
      expect(policy.Statement[0].Action).toContain("ce:GetCostAndUsage");
      expect(policy.Statement[0].Resource).toBe("*");
    });
  });
});
