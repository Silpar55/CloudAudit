# Database Schema

CloudAudit is designed for users or small business manager to manage their cloud providers and improve their billing based on suggestion from AI.

Clients will inherently required a cloud provide credentials, so by only requesting minimal information to access to their cloud provider API will be enough to offer the best UX experience.

# Tables

## User

- user_id --> **UUID** **\*PK**
- first_name --> **String**
- last_name --> **String**
- email --> **String**
- password_hash --> **String**
- phone --> **String**
- created_at --> **Timestamp**

##### Note: This user information is only for our page. For the user to be able to connect their cloud provider into our application it is required their respective data to access.

## Team

- team_id --> **UUID** **\*PK**
- name --> **String**
- created_at --> **Timestamp**

##### Note: This is the workplace where the business can add the team staff responsible to monitor and check the cost of the cloud provider. Each employee will need to create a **User** to be able to joing a **Team**

## Team_members

- team_member_id **UUID** **\*PK**
- team_id --> **UUID** **\*FK**
- user_id --> **UUID** **\*FK**
- role --> **string**
- created_at --> **Timestamp**

## AWS_account

- aws_account_id --> **UUID** **\*PK**
- team_id --> **UUID** **\*FK**
- iam_role_arn --> **String**
- connected_at --> **Timestamp**

###### Note: It is likely that each cloud provider has their different way to access their API, therefore it is necessary to create different table for each once.

##### Note 2: Each account is connected to an organization (**Team**). By this all the cloud providers will belong to everyone and not only for one person in the team.

## Cost_data (Detailed daily spending information)

- cost_data_id --> **UUID** **\*PK**
- aws_account_id --> **UUID** **\*FK**
- time_interval --> **Timestamp** (time_start/time_end)
- product_code --> **String** (EC2)
- usage_type --> **String** (USE2-BoxUsage:t3.medium)
- operation --> **String** (RunInstances)
- resource_id --> **String** (i-0abc123)
- usage_amount --> **Decimal** (1)
- unblended_cost --> **Decimal** (0.0416)
- region --> **String** (us-east-2)
- instance_type --> **String** (t3.medium)
- pricing_unit --> **String** (USD)
- usage_unit --> **String**. (hrs)
- public_cost --> **Decimal** (0.0416)
- blended_cost --> **Decimal** (avg organization cost)
- amortized_cost --> **Decimal** (upfront payments)
- tag_environment --> **String**
- tag_project --> **String**
- tag_owner --> **String**

## Resources

- resource_id --> **String** **\*PK**
- aws_account_id --> **UUID** **\*FK**
- service --> **String** (EC2, RDS, etc)
- instance_type --> **String**
- region --> **String**
- last_seen --> **Timestamp**

##### Note: This table is to easy do a look up at resources without the necessity to go through cost_data

## Daily_cost_summaries (Derived from Cost_data)

- daily_cost_id --> **UUID** **\*PK**
- aws_account_id --> **UUID** **\*FK**
- time_start --> **Timestamp**
- time_end --> **Timestamp**
- service --> **String**
- region --> **String**
- total_cost --> **Decimal**
- created_at --> **Timestamp**

##### Note: This table is used for:

- Dashboard
- Queries
- Baselines model

## Cost_anomalies (For ML)

- anomaly_id --> UUID PK
- daily_cost_id --> UUID FK
- aws_account_id --> UUID FK
- detected_at --> Timestamp
- resource_id --> String
- expected_cost --> Decimal
- deviation_pct --> Decimal
- severity --> Integer
- model_version --> String

## Recommendations

- recommendation_id --> **UUID** **\*PK**
- aws_account_id --> **UUID** **\*FK**
- resource_id --> **String**
- created_at --> **Timestamp**
- recommendation_type --> **String**
- description --> **String**
- estimated_monthly_savings --> **Decimal**
- confidence_score --> **Decimal**
- status --> **Integer**

## Audit_logs

- audit_log_id --> **UUID** **\*PK**
- team_id --> **UUID** **\*FK**
- user_id --> **UUID** **\*FK**
- action --> **String**
- details --> **JSON**
- created_at --> **Timestamp**
