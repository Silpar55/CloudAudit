# Future Tasks / Enhancements

## Overview

This document tracks future enhancements for CloudAudit once the MVP (authentication, teams, AWS connection, basic dashboard, CUR‑based ML) is complete.

These tasks focus on:

- Automating onboarding (CloudFormation).
- Hardening AWS integrations.
- Improving performance, data quality, and UX.

## 1. CloudFormation onboarding stack

**Goal:** Provide a one‑click setup for new customers.

**Tasks:**

- Create a CloudFormation template that:
  - Creates the IAM role for CloudAudit:
    - Trust policy allowing the CloudAudit AWS account/role to assume it (`sts:AssumeRole`).
    - Permission policy with least‑privilege access to:
      - Cost Explorer (`ce:GetCostAndUsage`).
      - CUR S3 bucket prefix (`s3:GetObject`).
      - EC2/RDS/CloudWatch read‑only for recommendations.
  - Creates the S3 bucket dedicated for CUR.
  - Adds the bucket policy required for the CUR service to write to that bucket.
  - Defines an `AWS::CUR::ReportDefinition` resource to enable CUR 2.0 (daily, Parquet, include resource IDs).

- Update documentation:
  - Main README explains: “Deploy this stack, then paste the generated Role ARN into CloudAudit.”

## 2. Dashboard backed by CUR aggregates

**Goal:** Use the internal warehouse as the main dashboard source instead of Cost Explorer.

**Tasks:**

- Build nightly aggregation jobs from `costdata` into a `service_daily_summary` table (costs by service/account/region).
- Update the React dashboard to read from this table via `/costs/summary`, keeping Cost Explorer only as a validation/troubleshooting view.

## 3. Automated anomaly runs and alerting

**Goal:** Move from manual “Start detection” to scheduled intelligence.

**Tasks:**

- Add a scheduler (node‑cron, EventBridge, or Lambda) to:
  - Run anomaly detection daily per account.
  - Write anomalies and recommendations automatically.
- Integrate email/Slack alerts for high‑severity anomalies using existing notification services in the roadmap.

## 4. Per‑resource and per‑team breakdowns

**Goal:** Provide deeper granularity and showback.

**Tasks:**

- Extend CUR ingestion to populate resource‑level and tag‑based summaries (for example, `tagowner`, `tagenvironment`).[
- Build UI views:
  - Cost by team (using tags plus mapping teams to tags).
  - Top N most expensive resources and fastest growing resources.

## 5. Additional AWS cost services (later)

**Ideas:**

- Add basic integration with AWS Cost Anomaly Detection as a secondary anomaly source to compare against CloudAudit’s own ML.
- Explore integrating with AWS Budgets for simple budget thresholds alongside anomaly detection.
