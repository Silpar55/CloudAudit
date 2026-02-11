# AWS Cost and Usage Reports (CUR) Guide

## What are AWS Cost and Usage Reports?

AWS Cost and Usage Reports (CUR) are the canonical, invoice‑level export of all AWS billing data for an account, delivered as CSV or Parquet files into an S3 bucket.

They include:

- Every line item charge and usage record.
- Detailed dimensions: service, operation, usage type, linked account, region, resource IDs, tags.
- Discount allocation (Reserved Instances/Savings Plans, credits, tax where applicable).

In CloudAudit, CUR is the primary data source for:

- Cost anomaly detection (ML).
- Cost optimization recommendations.
- Detailed dashboards and future chargeback/showback.

## What data does it give us?

CUR provides very granular records, typically:

- Time: hourly or daily.
- Dimensions:
  - Service (for example, AmazonEC2).
  - UsageType, Operation.
  - Linked account, region, Availability Zone.
  - Resource IDs (if enabled).
  - Tags (Environment, Project, Owner, and so on).
- Metrics: usage amounts, blended/unblended cost, amortized cost, public cost, discounts.

CloudAudit ingests CUR into:

- A raw/staging structure (for example, `costdata`) that mirrors CUR fields.
- Aggregated tables like `dailycostsummaries` used for charts and ML baselines.
- Downstream `costanomalies` and `recommendations` tables for user‑facing insights.

## How do we enable and access it?

For each connected AWS account (or org payer):

1. **Enable CUR (one‑time, initially via console; later via CloudFormation)**
   - In the Billing console → Cost & Usage Reports → Create report.
   - Choose hourly/daily granularity, include resource IDs, and send to a dedicated S3 bucket.

2. **CloudAudit access**
   - The IAM role the customer creates for CloudAudit gets `s3:GetObject` on the CUR bucket/prefix.
   - Optionally, we define an Athena table (via Glue or SQL) over the CUR data and query it from the backend.

## How is it used in CloudAudit?

- **Data ingestion job**
  - On a schedule (or triggered by a button “Start detection”), backend jobs read CUR data (via S3 or Athena) and populate `costdata` and `dailycostsummaries`.

- **ML anomaly detection**
  - The Python service uses `dailycostsummaries` to train and score time‑series models (for example, Isolation Forest) and persists results to `costanomalies`.

- **Recommendations**
  - CUR data plus live AWS APIs (EC2, RDS, CloudWatch) feed the `recommendations` table with estimated monthly savings and confidence scores.

CUR is the source of truth that backs analytics and ML in CloudAudit; Cost Explorer is the quick summary layer.
