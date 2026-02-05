# Database Schema: CloudAudit v6.0

CloudAudit is designed for users or small business managers to manage their cloud providers and improve their billing based on suggestions from AI.

By requesting only the minimal information required to access cloud provider APIs (like IAM Role ARNs and External IDs), we ensure a high-quality UX while maintaining security.

# Tables

## User

Stores internal platform user credentials and profiles.

- `user_id` --> **UUID** **\*PK** (Default: gen_random_uuid)
- `first_name` --> **TEXT**
- `last_name` --> **TEXT**
- `email` --> **TEXT** (Unique)
- `password` --> **TEXT**
- `phone` --> **TEXT**
- `country_code` --> **VARCHAR(2)**
- `created_at` --> **TIMESTAMPTZ**

> **Note:** This user information is only for platform authentication. To connect cloud providers, the application uses the credentials defined in the **AWS_accounts** table.

---

## Team

The organizational unit or "workplace" for a business entity.

- `team_id` --> **UUID** **\*PK**
- `name` --> **TEXT**
- `created_at` --> **TIMESTAMPTZ**

## Team_members

Handles the relationship between Users and Teams with specific access levels.

- `team_member_id` --> **UUID** **\*PK**
- `team_id` --> **UUID** **\*FK** (ON DELETE CASCADE)
- `user_id` --> **UUID** **\*FK** (ON DELETE CASCADE)
- `role` --> **TEXT** (Constraint: 'owner', 'admin', 'member')
- `is_active` --> **BOOLEAN** (Default: TRUE)
- `created_at` --> **TIMESTAMPTZ**

---

## AWS_accounts

Stores connection details and IAM metadata for AWS integration.

- `aws_account_id` --> **VARCHAR(12)** **\*PK**
- `team_id` --> **UUID** **\*FK** (ON DELETE CASCADE)
- `external_id` --> **UUID**
- `iam_role_arn` --> **TEXT**
- `is_active` --> **BOOLEAN** (Default: TRUE)
- `connected_at` --> **TIMESTAMPTZ**
- `disconnected_at` --> **TIMESTAMP** (Nullable)

> **Note:** Accounts are connected to a **Team**, ensuring that cloud visibility is shared across the organization rather than tied to a single user.

---

## Cost_data

Granular daily spending information ingested via cloud APIs.

- `cost_data_id` --> **UUID** **\*PK**
- `aws_account_id` --> **VARCHAR(12)** **\*FK**
- `time_interval` --> **TIMESTAMP**
- `product_code` --> **TEXT**
- `usage_type` --> **TEXT**
- `operation` --> **TEXT**
- `resource_id` --> **TEXT**
- `usage_amount` --> **DECIMAL**
- `unblended_cost` --> **DECIMAL**
- `region` --> **TEXT**
- `instance_type` --> **TEXT**
- `pricing_unit` --> **TEXT**
- `usage_unit` --> **TEXT**
- `public_cost` --> **DECIMAL**
- `blended_cost` --> **DECIMAL**
- `amortized_cost` --> **DECIMAL**
- `tag_environment` --> **TEXT**
- `tag_project` --> **TEXT**
- `tag_owner` --> **TEXT**

## Resources

A lookup table for current tracked cloud assets to simplify queries.

- `resource_id` --> **TEXT** **\*PK**
- `aws_account_id` --> **VARCHAR(12)** **\*FK** (ON DELETE CASCADE)
- `service` --> **TEXT**
- `instance_type` --> **TEXT**
- `region` --> **TEXT**
- `last_seen` --> **TIMESTAMPTZ**

---

## Daily_cost_summaries

Aggregated billing data used for the dashboard and ML baseline generation.

- `daily_cost_id` --> **UUID** **\*PK**
- `aws_account_id` --> **VARCHAR(12)** **\*FK**
- `time_start` --> **TIMESTAMP**
- `time_end` --> **TIMESTAMP**
- `service` --> **TEXT**
- `region` --> **TEXT**
- `total_cost` --> **DECIMAL**
- `created_at` --> **TIMESTAMPTZ**

---

## Cost_anomalies

Tracks spending spikes where actual costs deviate from ML-predicted baselines.

- `anomaly_id` --> **UUID** **\*PK**
- `daily_cost_id` --> **UUID** **\*FK**
- `aws_account_id` --> **VARCHAR(12)** **\*FK**
- `resource_id` --> **TEXT** **\*FK**
- `detected_at` --> **TIMESTAMPTZ**
- `expected_cost` --> **DECIMAL**
- `deviation_pct` --> **DECIMAL**
- `severity` --> **INTEGER**
- `model_version` --> **TEXT**

## Recommendations

AI-generated optimization strategies to reduce monthly burn.

- `recommendation_id` --> **UUID** **\*PK**
- `aws_account_id` --> **VARCHAR(12)** **\*FK**
- `resource_id` --> **TEXT** **\*FK**
- `recommendation_type` --> **TEXT**
- `description` --> **TEXT**
- `estimated_monthly_savings` --> **DECIMAL**
- `confidence_score` --> **DECIMAL**
- `status` --> **INTEGER**
- `created_at` --> **TIMESTAMPTZ**

---

## Audit_logs

Security trail tracking all internal platform actions.

- `audit_log_id` --> **UUID** **\*PK**
- `team_id` --> **UUID** **\*FK**
- `user_id` --> **UUID** **\*FK**
- `action` --> **TEXT**
- `details` --> **JSONB** (Flexible metadata for action context)
- `created_at` --> **TIMESTAMPTZ**
