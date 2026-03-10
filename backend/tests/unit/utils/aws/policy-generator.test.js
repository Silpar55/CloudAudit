import { describe, expect, it } from "@jest/globals";
import {
  generateScripts,
  generateReadOnlyAuditPolicy,
  generateCostExplorerPolicy,
} from "#utils/aws/policy-generator.js";

describe("AWS Policy Generator", () => {
  describe("generateScripts", () => {
    it("Should generate all required scripts and instructions with the external ID", () => {
      const pendingAccount = { external_id: "ext-789", externalId: "ext-789" };
      const result = generateScripts(pendingAccount);

      // Check structural properties
      expect(result).toHaveProperty("trustPolicyJson");
      expect(result).toHaveProperty("permissionsPolicyJson");
      expect(result).toHaveProperty("cloudShellScript");
      expect(result).toHaveProperty("instructions");
      expect(result).toHaveProperty("cloudShellInstructions");

      // Check external ID injection
      expect(result.trustPolicyJson).toContain("ext-789");
      expect(result.cloudShellScript).toContain("ext-789"); // Should be inside the script via injection
      expect(result.permissionsPolicyJson).toContain("sts:GetCallerIdentity");
      expect(result.instructions.externalId).toBe("ext-789");

      // Verify valid JSON outputs
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
    });
  });
});
