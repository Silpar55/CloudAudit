import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from "@jest/globals";
import {
  generateScripts,
  generateReadOnlyAuditPolicy,
  generateCostExplorerPolicy,
} from "#utils/aws/policy-generator.js";

const TEST_PLATFORM_ROLE_ARN =
  "arn:aws:iam::111122223333:role/CloudAuditPlatformRole";

describe("AWS Policy Generator", () => {
  beforeEach(() => {
    process.env.CLOUDAUDIT_PLATFORM_ROLE_ARN = TEST_PLATFORM_ROLE_ARN;
  });

  afterEach(() => {
    delete process.env.CLOUDAUDIT_PLATFORM_ROLE_ARN;
    delete process.env.CLOUDAUDIT_PLATFORM_ROLE_ARN_PRODUCTION;
    delete process.env.CLOUDAUDIT_PLATFORM_ROLE_ARN_DEVELOPMENT;
    delete process.env.CLOUDAUDIT_PLATFORM_AWS_ACCOUNT_ID;
    delete process.env.CLOUDAUDIT_PLATFORM_ROLE_NAME;
    delete process.env.CLOUDAUDIT_PLATFORM_MODE;
  });

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
      expect(result.platformRoleArn).toBe(TEST_PLATFORM_ROLE_ARN);
      expect(result.platformRoleArns).toEqual([TEST_PLATFORM_ROLE_ARN]);

      // Verify valid JSON outputs
      expect(() => JSON.parse(result.trustPolicyJson)).not.toThrow();
      expect(() => JSON.parse(result.permissionsPolicyJson)).not.toThrow();
    });

    it("Should use an array of principals in trust when prod and dev are set", () => {
      const prodArn =
        "arn:aws:iam::111122223333:role/CloudAuditPlatformRoleProduction";
      const devArn =
        "arn:aws:iam::111122223333:role/CloudAuditPlatformRoleDevelopment";
      delete process.env.CLOUDAUDIT_PLATFORM_ROLE_ARN;
      process.env.CLOUDAUDIT_PLATFORM_ROLE_ARN_PRODUCTION = prodArn;
      process.env.CLOUDAUDIT_PLATFORM_ROLE_ARN_DEVELOPMENT = devArn;
      process.env.CLOUDAUDIT_PLATFORM_MODE = "production";

      const pendingAccount = { external_id: "ext-xyz", externalId: "ext-xyz" };
      const result = generateScripts(pendingAccount);

      const trust = JSON.parse(result.trustPolicyJson);
      expect(trust.Statement[0].Principal.AWS).toEqual([prodArn, devArn]);
      expect(result.platformRoleArns).toEqual([prodArn, devArn]);
      expect(result.platformRoleArn).toBe(prodArn);
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
