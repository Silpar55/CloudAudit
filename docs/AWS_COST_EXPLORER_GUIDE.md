# AWS Cost Explorer Guide

## What is AWS Cost Explorer?

AWS Cost Explorer is a managed cost analytics service that lets you query and visualize your historical AWS spend and usage, grouped by dimensions like service, account, region, and tags.

In CloudAudit, Cost Explorer powers the **first, quick view** of a team’s AWS spend when they open the dashboard.

## What data does it return?

Using the Cost Explorer API (`GetCostAndUsage`), CloudAudit retrieves:

- Time range (for example, last 30 days, daily granularity).
- Groupings: typically by `SERVICE` for the main dashboard.
- Metrics: `UnblendedCost`, optionally `AmortizedCost` and `UsageQuantity`.

The API response is JSON containing:

- Time periods (start/end).
- Groups per period (for example, `AmazonEC2`, `AmazonRDS`).
- Cost metrics (amount, unit) per group.

CloudAudit converts this into a summary table (for example, `ce_service_daily_summary`) that drives charts and totals in the dashboard.

## How do we call it?

Backend (Node.js):

- Assumes the customer’s IAM role via STS.
- Uses the AWS SDK (Cost Explorer client) to call `GetCostAndUsage` with:
  - Time period: last 30 days.
  - Granularity: `DAILY`.
  - GroupBy: `SERVICE`.
  - Metrics: `UnblendedCost`.

We cache the result in PostgreSQL to avoid calling the API on every page load and to keep usage within Cost Explorer API best practices.

## How is it used in CloudAudit?

- **First dashboard load**
  - When a team with a connected AWS account opens the dashboard, we show “Cost by service (last 30 days)” using cached Cost Explorer data.

- **User value**
  - Quick visual of which services cost the most.
  - Detect obvious waste (for example, a service they forgot about) even before running ML detection.

Cost Explorer is not the source for ML or recommendations; it is the fast, high‑level view for the UI.
