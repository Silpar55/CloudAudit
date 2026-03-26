/**
 * Resolves credentials for calling STS AssumeRole into customer accounts.
 *
 * CLOUDAUDIT_PLATFORM_ROLE_* env vars describe which IAM role customers must trust;
 * they do NOT switch the SDK default chain by themselves. This module chains:
 *   default credentials (e.g. SSO) → sts:AssumeRole → CloudAudit platform role
 * unless the caller identity is already that platform role (e.g. ECS task role).
 *
 * Set SKIP_PLATFORM_ASSUME_ROLE=true in tests to skip (uses default chain only).
 */

import {
  createSTSClient,
  getCallerIdentity,
  assumeRole,
} from "./client-factory.js";
import { getPlatformRoleArn } from "./platform-role.js";

const REGION = process.env.AWS_REGION || "us-east-1";

/** @type {{ mode: 'skip' } | { mode: 'direct' } | { mode: 'assumed', credentials: object, expiration: Date }} */
let cached = null;

function roleNameFromIamRoleArn(arn) {
  const idx = arn.indexOf(":role/");
  if (idx === -1) return null;
  const rest = arn.slice(idx + 6);
  const segments = rest.split("/");
  return segments[segments.length - 1] || null;
}

function assumedRoleNameFromCallerArn(arn) {
  const marker = "assumed-role/";
  const i = arn.indexOf(marker);
  if (i === -1) return null;
  const after = arn.slice(i + marker.length);
  const slash = after.indexOf("/");
  return slash === -1 ? after : after.slice(0, slash);
}

export function resetPlatformCredentialsCache() {
  cached = null;
}

/**
 * Ensures cached platform credentials (SSO → AssumeRole platform role, or direct).
 */
export async function ensurePlatformCredentials() {
  if (process.env.SKIP_PLATFORM_ASSUME_ROLE === "true") {
    cached = { mode: "skip" };
    return;
  }

  if (cached?.mode === "skip") return;

  if (cached?.mode === "assumed" && cached.expiration) {
    const bufferMs = 5 * 60 * 1000;
    if (Date.now() < cached.expiration.getTime() - bufferMs) {
      return;
    }
    cached = null;
  }

  if (cached?.mode === "direct") return;

  const platformArn = getPlatformRoleArn();
  const platformRoleName = roleNameFromIamRoleArn(platformArn);

  const baseClient = createSTSClient(REGION);
  const identity = await getCallerIdentity(baseClient);
  const callerRoleName = assumedRoleNameFromCallerArn(identity.Arn);

  if (
    platformRoleName &&
    callerRoleName &&
    callerRoleName === platformRoleName
  ) {
    cached = { mode: "direct" };
    return;
  }

  const { Credentials } = await assumeRole(baseClient, {
    RoleArn: platformArn,
    RoleSessionName: `CloudAuditPlatform-${Date.now()}`,
    DurationSeconds: 3600,
  });

  cached = {
    mode: "assumed",
    credentials: {
      accessKeyId: Credentials.AccessKeyId,
      secretAccessKey: Credentials.SecretAccessKey,
      sessionToken: Credentials.SessionToken,
    },
    expiration: Credentials.Expiration,
  };
}

/**
 * Credentials for STS (and downstream) clients: undefined = use default provider
 * (already running as platform role). Otherwise temporary keys from AssumeRole.
 */
export async function getPlatformStsCredentials() {
  await ensurePlatformCredentials();
  if (!cached) {
    return undefined;
  }
  if (cached.mode === "skip" || cached.mode === "direct") {
    return undefined;
  }
  return cached.credentials;
}
