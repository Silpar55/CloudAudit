#!/usr/bin/env bash
#
# CloudAudit — create PRODUCTION + DEVELOPMENT platform IAM roles (safe to paste into AWS CloudShell)
#
# - No heredocs for Python (avoids "unexpected EOF" / quote errors when pasting)
# - Uses file:///absolute/path for IAM JSON (avoids "$(cat ...)" quote explosions)
# - Disables AWS CLI pager so nothing opens less/vi or waits for Enter
#
# Usage: bash create-cloudaudit-platform-roles.sh
#
# Optional:
#   export DEV_ASSUMER_ARNS="arn:aws:iam::ACCOUNT:role/...,arn:..."
#

set -euo pipefail

export AWS_PAGER=""
export PAGER=cat
export AWS_CLI_AUTO_PROMPT=off

echo "[cloudaudit] Starting (prod + dev platform roles)..." >&2

if ! command -v aws >/dev/null 2>&1; then
  echo "[cloudaudit] ERROR: aws CLI not found." >&2
  exit 1
fi
if ! command -v python3 >/dev/null 2>&1; then
  echo "[cloudaudit] ERROR: python3 not found." >&2
  exit 1
fi

ROLE_PROD="${CLOUDAUDIT_PLATFORM_ROLE_NAME_PRODUCTION:-CloudAuditPlatformRoleProduction}"
ROLE_DEV="${CLOUDAUDIT_PLATFORM_ROLE_NAME_DEVELOPMENT:-CloudAuditPlatformRoleDevelopment}"
DEV_ASSUMER_ARNS="${DEV_ASSUMER_ARNS:-}"

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
echo "[cloudaudit] Account: ${ACCOUNT_ID}" >&2
echo "[cloudaudit] Roles: ${ROLE_PROD} | ${ROLE_DEV}" >&2

# If DEV_ASSUMER_ARNS is unset, resolve the current CLI identity (e.g. IAM Identity Center SSO)
# so CloudAuditPlatformRoleDevelopment trusts your SSO role and the backend can sts:AssumeRole it.
if [[ -z "${DEV_ASSUMER_ARNS// }" ]]; then
  CALLER_ARN="$(aws sts get-caller-identity --query Arn --output text)"
  if [[ "${CALLER_ARN}" == *"assumed-role"* ]]; then
    RNAME="$(echo "${CALLER_ARN}" | sed -n 's#.*assumed-role/\([^/]*\)/.*#\1#p')"
    if [[ -n "${RNAME}" ]]; then
      RESOLVED=""
      if RESOLVED="$(aws iam get-role --role-name "${RNAME}" --query Role.Arn --output text 2>/dev/null)"; then
        :
      else
        RESOLVED="$(aws iam list-roles --query "Roles[?RoleName=='${RNAME}'].Arn | [0]" --output text 2>/dev/null || true)"
      fi
      if [[ -n "${RESOLVED}" && "${RESOLVED}" != "None" && "${RESOLVED}" == arn:aws:iam::"${ACCOUNT_ID}":* ]]; then
        DEV_ASSUMER_ARNS="${RESOLVED}"
        echo "[cloudaudit] Auto-set DEV_ASSUMER_ARNS from your current session: ${DEV_ASSUMER_ARNS}" >&2
      else
        echo "[cloudaudit] WARN: Could not resolve IAM role ARN for assumed-role name '${RNAME}'." >&2
        echo "[cloudaudit] Set DEV_ASSUMER_ARNS to your SSO role ARN, e.g.:" >&2
        echo "[cloudaudit]   arn:aws:iam::${ACCOUNT_ID}:role/aws-reserved/sso.amazonaws.com/${RNAME}" >&2
      fi
    fi
  fi
fi

PID="$$"
PERM_JSON="/tmp/cloudaudit-perm-${PID}.json"
TRUST_BASE_JSON="/tmp/cloudaudit-trust-base-${PID}.json"
TRUST_PROD_JSON="/tmp/cloudaudit-trust-prod-${PID}.json"
TRUST_DEV_JSON="/tmp/cloudaudit-trust-dev-${PID}.json"

trap "rm -f \"${PERM_JSON}\" \"${TRUST_BASE_JSON}\" \"${TRUST_PROD_JSON}\" \"${TRUST_DEV_JSON}\"" EXIT

cat > "${PERM_JSON}" <<'PERMEOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AssumeCustomerCloudAuditRoles",
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Resource": "arn:aws:iam::*:role/CloudAuditRole"
    },
    {
      "Sid": "GetCallerIdentity",
      "Effect": "Allow",
      "Action": "sts:GetCallerIdentity",
      "Resource": "*"
    }
  ]
}
PERMEOF

cat > "${TRUST_BASE_JSON}" <<'TRUSTEOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowEc2InstanceProfiles",
      "Effect": "Allow",
      "Principal": { "Service": "ec2.amazonaws.com" },
      "Action": "sts:AssumeRole"
    },
    {
      "Sid": "AllowEcsTasks",
      "Effect": "Allow",
      "Principal": { "Service": "ecs-tasks.amazonaws.com" },
      "Action": "sts:AssumeRole"
    },
    {
      "Sid": "AllowLambda",
      "Effect": "Allow",
      "Principal": { "Service": "lambda.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
TRUSTEOF

# Append SSO / IAM principals to BOTH prod and dev trust (local npm may use MODE=production or SSO assume prod)
export TRUST_BASE_JSON
export TRUST_PROD_JSON
export TRUST_DEV_JSON
export DEV_ASSUMER_ARNS
python3 -c 'import json,os;base=os.environ["TRUST_BASE_JSON"];p=os.environ["TRUST_PROD_JSON"];d=os.environ["TRUST_DEV_JSON"];extra=os.environ.get("DEV_ASSUMER_ARNS","").strip();doc=json.load(open(base));parts=[x.strip() for x in extra.split(",") if x.strip()] if extra else [];[doc["Statement"].append({"Sid":"AllowIamAssumer%d"%i,"Effect":"Allow","Principal":{"AWS":arn},"Action":"sts:AssumeRole"}) for i,arn in enumerate(parts)];json.dump(doc,open(p,"w"),indent=2);json.dump(doc,open(d,"w"),indent=2)'

# file:/// must be three slashes before absolute path on Linux
file_uri() {
  local p="$1"
  echo "file://${p}"
}

upsert_role() {
  local name="$1"
  local trust_file="$2"
  local trust_uri
  local perm_uri
  trust_uri="$(file_uri "${trust_file}")"
  perm_uri="$(file_uri "${PERM_JSON}")"

  echo "[cloudaudit] Updating role: ${name}" >&2
  if aws iam get-role --role-name "${name}" &>/dev/null; then
    aws iam update-assume-role-policy \
      --role-name "${name}" \
      --policy-document "${trust_uri}"
  else
    aws iam create-role \
      --role-name "${name}" \
      --assume-role-policy-document "${trust_uri}" \
      --description "CloudAudit platform (${name})"
  fi
  aws iam put-role-policy \
    --role-name "${name}" \
    --policy-name CloudAuditPlatformAssumeCustomerRoles \
    --policy-document "${perm_uri}"
  aws iam update-role \
    --role-name "${name}" \
    --max-duration-seconds 3600 \
    2>/dev/null || true
}

echo "[cloudaudit] Creating/updating PRODUCTION role..." >&2
upsert_role "${ROLE_PROD}" "${TRUST_PROD_JSON}"

echo "[cloudaudit] Creating/updating DEVELOPMENT role..." >&2
upsert_role "${ROLE_DEV}" "${TRUST_DEV_JSON}"

ARN_PROD="arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_PROD}"
ARN_DEV="arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_DEV}"

echo "" >&2
echo "===================================================================" >&2
echo " Done. Add to backend/.env:" >&2
echo "===================================================================" >&2
echo "CLOUDAUDIT_PLATFORM_ROLE_ARN_PRODUCTION=${ARN_PROD}" >&2
echo "CLOUDAUDIT_PLATFORM_ROLE_ARN_DEVELOPMENT=${ARN_DEV}" >&2
echo "CLOUDAUDIT_PLATFORM_MODE=production" >&2
echo "===================================================================" >&2
echo "${ARN_PROD}"
echo "${ARN_DEV}"
