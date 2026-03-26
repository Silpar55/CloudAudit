/**
 * CloudAudit platform IAM role(s) used to call sts:AssumeRole into customer accounts.
 *
 * Modes (CLOUDAUDIT_PLATFORM_MODE):
 * - production — use production platform role for STS (deployed API).
 * - development — use development platform role for STS (local Docker / laptop).
 *
 * Customer trust policies should list every platform role that may access the account
 * (typically production + development). Use getPlatformRoleArnsForCustomerTrust().
 *
 * Environment (pick one style):
 *
 * 1) Legacy single ARN (one principal everywhere):
 *    CLOUDAUDIT_PLATFORM_ROLE_ARN
 *
 * 2) Split prod + dev (recommended):
 *    CLOUDAUDIT_PLATFORM_MODE=production|development
 *    CLOUDAUDIT_PLATFORM_ROLE_ARN_PRODUCTION
 *    CLOUDAUDIT_PLATFORM_ROLE_ARN_DEVELOPMENT
 *    Optional: CLOUDAUDIT_PLATFORM_AWS_ACCOUNT_ID + *_ROLE_NAME_* to build ARNs.
 */

const DEFAULT_PROD_ROLE_NAME = "CloudAuditPlatformRoleProduction";
const DEFAULT_DEV_ROLE_NAME = "CloudAuditPlatformRoleDevelopment";

/** IAM role ARN (supports optional path segments). */
const IAM_ROLE_ARN = /^arn:aws:iam::\d{12}:role\/[\w+=,.@\/-]+$/;

function assertValidRoleArn(arn, label) {
  if (!IAM_ROLE_ARN.test(arn)) {
    throw new Error(
      `${label} must be a valid IAM role ARN (arn:aws:iam::123456789012:role/Name)`,
    );
  }
}

function buildArnFromAccount(accountId, roleName) {
  if (!/^\d{12}$/.test(accountId)) {
    throw new Error(
      "CLOUDAUDIT_PLATFORM_AWS_ACCOUNT_ID must be a 12-digit AWS account ID",
    );
  }
  return `arn:aws:iam::${accountId}:role/${roleName}`;
}

/**
 * Resolves production platform role ARN from env (no mode switch).
 */
export function getProductionPlatformRoleArn() {
  const explicit = process.env.CLOUDAUDIT_PLATFORM_ROLE_ARN_PRODUCTION?.trim();
  if (explicit) {
    assertValidRoleArn(explicit, "CLOUDAUDIT_PLATFORM_ROLE_ARN_PRODUCTION");
    return explicit;
  }
  const accountId = process.env.CLOUDAUDIT_PLATFORM_AWS_ACCOUNT_ID?.trim();
  if (accountId) {
    const roleName =
      process.env.CLOUDAUDIT_PLATFORM_ROLE_NAME_PRODUCTION?.trim() ||
      DEFAULT_PROD_ROLE_NAME;
    return buildArnFromAccount(accountId, roleName);
  }
  return null;
}

/**
 * Resolves development platform role ARN from env (no mode switch).
 */
export function getDevelopmentPlatformRoleArn() {
  const explicit = process.env.CLOUDAUDIT_PLATFORM_ROLE_ARN_DEVELOPMENT?.trim();
  if (explicit) {
    assertValidRoleArn(explicit, "CLOUDAUDIT_PLATFORM_ROLE_ARN_DEVELOPMENT");
    return explicit;
  }
  const accountId = process.env.CLOUDAUDIT_PLATFORM_AWS_ACCOUNT_ID?.trim();
  if (accountId) {
    const roleName =
      process.env.CLOUDAUDIT_PLATFORM_ROLE_NAME_DEVELOPMENT?.trim() ||
      DEFAULT_DEV_ROLE_NAME;
    return buildArnFromAccount(accountId, roleName);
  }
  return null;
}

/**
 * All distinct platform role ARNs that should appear in customer trust policies.
 * Legacy CLOUDAUDIT_PLATFORM_ROLE_ARN alone → single principal.
 * Otherwise → union of configured production and development ARNs (at least one required).
 */
export function getPlatformRoleArnsForCustomerTrust() {
  const legacy = process.env.CLOUDAUDIT_PLATFORM_ROLE_ARN?.trim();
  if (legacy) {
    assertValidRoleArn(legacy, "CLOUDAUDIT_PLATFORM_ROLE_ARN");
    return [legacy];
  }

  const prod = getProductionPlatformRoleArn();
  const dev = getDevelopmentPlatformRoleArn();
  const out = [];
  if (prod) out.push(prod);
  if (dev) out.push(dev);
  const unique = [...new Set(out)];
  if (unique.length === 0) {
    throw new Error(
      "Configure platform role ARNs: set CLOUDAUDIT_PLATFORM_ROLE_ARN, or " +
        "CLOUDAUDIT_PLATFORM_ROLE_ARN_PRODUCTION / CLOUDAUDIT_PLATFORM_ROLE_ARN_DEVELOPMENT, " +
        "or CLOUDAUDIT_PLATFORM_AWS_ACCOUNT_ID with role name variables. " +
        "See scripts/aws/create-cloudaudit-platform-roles.sh and backend/.env.example.",
    );
  }
  return unique;
}

function isDevelopmentMode() {
  const mode = process.env.CLOUDAUDIT_PLATFORM_MODE?.trim().toLowerCase();
  if (mode === "development" || mode === "dev") return true;
  if (mode === "production" || mode === "prod") return false;
  if (mode) {
    throw new Error(
      'CLOUDAUDIT_PLATFORM_MODE must be "production" or "development"',
    );
  }
  // Unset: use development platform role for local npm start (SSO); production
  // workloads should set NODE_ENV=production and CLOUDAUDIT_PLATFORM_MODE=production.
  const nodeEnv = process.env.NODE_ENV?.toLowerCase();
  if (nodeEnv === "production") {
    return false;
  }
  return true;
}

/**
 * Resolves which platform identity this process uses for STS AssumeRole (customer access).
 * Honors CLOUDAUDIT_PLATFORM_MODE when prod/dev split is configured.
 */
export function getPlatformRoleArn() {
  const legacy = process.env.CLOUDAUDIT_PLATFORM_ROLE_ARN?.trim();
  if (legacy) {
    assertValidRoleArn(legacy, "CLOUDAUDIT_PLATFORM_ROLE_ARN");
    return legacy;
  }

  const prod = getProductionPlatformRoleArn();
  const dev = getDevelopmentPlatformRoleArn();
  const devMode = isDevelopmentMode();

  if (prod && dev) {
    return devMode ? dev : prod;
  }

  if (prod && !dev) {
    if (devMode) {
      throw new Error(
        "CLOUDAUDIT_PLATFORM_MODE=development but only a production platform role is configured; " +
          "set CLOUDAUDIT_PLATFORM_ROLE_ARN_DEVELOPMENT (or CLOUDAUDIT_PLATFORM_ROLE_NAME_DEVELOPMENT with account ID)",
      );
    }
    return prod;
  }

  if (dev && !prod) {
    if (!devMode) {
      throw new Error(
        "CLOUDAUDIT_PLATFORM_MODE=production but only a development platform role is configured; " +
          "set CLOUDAUDIT_PLATFORM_ROLE_ARN_PRODUCTION (or CLOUDAUDIT_PLATFORM_ROLE_NAME_PRODUCTION with account ID)",
      );
    }
    return dev;
  }

  throw new Error(
    "Set CLOUDAUDIT_PLATFORM_ROLE_ARN or configure production/development platform roles. " +
      "See backend/.env.example and scripts/aws/create-cloudaudit-platform-roles.sh",
  );
}
