/**
 * CloudAudit — Unit tests for `platform-role`.
 * Run from `backend/` with `npm test`.
 */

import { afterEach, describe, expect, it } from "@jest/globals";
import {
  getPlatformRoleArn,
  getPlatformRoleArnsForCustomerTrust,
  getDevelopmentPlatformRoleArn,
  getProductionPlatformRoleArn,
} from "#utils/aws/platform-role.js";

const PROD =
  "arn:aws:iam::123456789012:role/CloudAuditPlatformRoleProduction";
const DEV =
  "arn:aws:iam::123456789012:role/CloudAuditPlatformRoleDevelopment";

describe("platform-role", () => {
  afterEach(() => {
    delete process.env.CLOUDAUDIT_PLATFORM_ROLE_ARN;
    delete process.env.CLOUDAUDIT_PLATFORM_ROLE_ARN_PRODUCTION;
    delete process.env.CLOUDAUDIT_PLATFORM_ROLE_ARN_DEVELOPMENT;
    delete process.env.CLOUDAUDIT_PLATFORM_AWS_ACCOUNT_ID;
    delete process.env.CLOUDAUDIT_PLATFORM_ROLE_NAME;
    delete process.env.CLOUDAUDIT_PLATFORM_ROLE_NAME_PRODUCTION;
    delete process.env.CLOUDAUDIT_PLATFORM_ROLE_NAME_DEVELOPMENT;
    delete process.env.CLOUDAUDIT_PLATFORM_MODE;
    process.env.NODE_ENV = "test";
  });

  it("legacy CLOUDAUDIT_PLATFORM_ROLE_ARN wins for trust and STS", () => {
    process.env.CLOUDAUDIT_PLATFORM_ROLE_ARN =
      "arn:aws:iam::123456789012:role/Legacy";
    expect(getPlatformRoleArnsForCustomerTrust()).toEqual([
      "arn:aws:iam::123456789012:role/Legacy",
    ]);
    expect(getPlatformRoleArn()).toBe(
      "arn:aws:iam::123456789012:role/Legacy",
    );
  });

  it("returns prod and dev ARNs for customer trust when both configured", () => {
    process.env.CLOUDAUDIT_PLATFORM_ROLE_ARN_PRODUCTION = PROD;
    process.env.CLOUDAUDIT_PLATFORM_ROLE_ARN_DEVELOPMENT = DEV;
    expect(getPlatformRoleArnsForCustomerTrust()).toEqual([PROD, DEV]);
  });

  it("uses production role for STS when MODE is production", () => {
    process.env.CLOUDAUDIT_PLATFORM_ROLE_ARN_PRODUCTION = PROD;
    process.env.CLOUDAUDIT_PLATFORM_ROLE_ARN_DEVELOPMENT = DEV;
    process.env.CLOUDAUDIT_PLATFORM_MODE = "production";
    expect(getPlatformRoleArn()).toBe(PROD);
  });

  it("uses development role for STS when MODE is development", () => {
    process.env.CLOUDAUDIT_PLATFORM_ROLE_ARN_PRODUCTION = PROD;
    process.env.CLOUDAUDIT_PLATFORM_ROLE_ARN_DEVELOPMENT = DEV;
    process.env.CLOUDAUDIT_PLATFORM_MODE = "development";
    expect(getPlatformRoleArn()).toBe(DEV);
  });

  it("defaults to development when MODE is unset and NODE_ENV is not production", () => {
    process.env.CLOUDAUDIT_PLATFORM_ROLE_ARN_PRODUCTION = PROD;
    process.env.CLOUDAUDIT_PLATFORM_ROLE_ARN_DEVELOPMENT = DEV;
    delete process.env.CLOUDAUDIT_PLATFORM_MODE;
    process.env.NODE_ENV = "test";
    expect(getPlatformRoleArn()).toBe(DEV);
  });

  it("defaults to production when MODE is unset and NODE_ENV is production", () => {
    process.env.CLOUDAUDIT_PLATFORM_ROLE_ARN_PRODUCTION = PROD;
    process.env.CLOUDAUDIT_PLATFORM_ROLE_ARN_DEVELOPMENT = DEV;
    delete process.env.CLOUDAUDIT_PLATFORM_MODE;
    process.env.NODE_ENV = "production";
    expect(getPlatformRoleArn()).toBe(PROD);
  });

  it("builds ARNs from account + default role names", () => {
    process.env.CLOUDAUDIT_PLATFORM_AWS_ACCOUNT_ID = "123456789012";
    expect(getProductionPlatformRoleArn()).toBe(
      "arn:aws:iam::123456789012:role/CloudAuditPlatformRoleProduction",
    );
    expect(getDevelopmentPlatformRoleArn()).toBe(
      "arn:aws:iam::123456789012:role/CloudAuditPlatformRoleDevelopment",
    );
  });

  it("throws when no configuration is present", () => {
    expect(() => getPlatformRoleArn()).toThrow(
      /CLOUDAUDIT_PLATFORM_ROLE_ARN or configure production\/development/,
    );
    expect(() => getPlatformRoleArnsForCustomerTrust()).toThrow(
      /Configure platform role ARNs/,
    );
  });

  it("throws on invalid account id", () => {
    process.env.CLOUDAUDIT_PLATFORM_AWS_ACCOUNT_ID = "bad";
    expect(() => getProductionPlatformRoleArn()).toThrow(/12-digit/);
  });
});
