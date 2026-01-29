-- Database: cloudaudit v4.0

-- DROP FIRST TABLES WITH FOREIGN KEYS
DROP TABLE IF EXISTS cost_anomalies;
DROP TABLE IF EXISTS cost_data;
DROP TABLE IF EXISTS daily_cost_summaries;
DROP TABLE IF EXISTS recommendations;
DROP TABLE IF EXISTS resources;
DROP TABLE IF EXISTS aws_accounts;
DROP TABLE IF EXISTS team_members;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS teams;

-- USERS TABLE

CREATE TABLE users (
	user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	first_name TEXT NOT NULL,
	last_name TEXT NOT NULL,
	email TEXT NOT NULL UNIQUE,
	password TEXT NOT NULL,
	phone TEXT NOT NULL,
	country_code VARCHAR(2) NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	UNIQUE(user_id, email)
);

-- TEAMS TABLE

CREATE TABLE teams (
	team_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name TEXT NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- TEAM_MEMBERS TABLE

CREATE TABLE team_members (
	team_member_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	team_id  UUID REFERENCES teams (team_id) NOT NULL,
	user_id UUID REFERENCES users (user_id) NOT NULL,
	role TEXT NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AWS_ACCOUNT TABLE

CREATE TABLE aws_accounts (
	aws_account_id VARCHAR(12) PRIMARY KEY,
	team_id UUID REFERENCES teams (team_id) NOT NULL,
	iam_role_arn TEXT NOT NULL,
	is_active BOOL NOT NULL DEFAULT TRUE, 
	disconnected_at TIMESTAMP,
	connected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- COST_DATA TABLE

CREATE TABLE cost_data (
	cost_data_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	aws_account_id VARCHAR(12) REFERENCES aws_accounts (aws_account_id) NOT NULL,
	time_interval TIMESTAMP NOT NULL,
	product_code TEXT NOT NULL,
	usage_type TEXT NOT NULL,
	operation TEXT NOT NULL,
	resource_id TEXT NOT NULL,
	usage_amount DECIMAL NOT NULL,
	unblended_cost DECIMAL NOT NULL,
	region TEXT NOT NULL,
	instance_type TEXT NOT NULL,
	pricing_unit TEXT NOT NULL,
	usage_unit TEXT NOT NULL, 
	public_cost DECIMAL NOT NULL,
	blended_cost DECIMAL NOT NULL,
	amortized_cost DECIMAL NOT NULL,
	tag_environment TEXT NOT NULL,
	tag_project TEXT NOT NULL,
	tag_owner TEXT NOT NULL
);

-- DAILY_COST_SUMMARIES TABLE

CREATE TABLE daily_cost_summaries (
	daily_cost_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	aws_account_id VARCHAR(12) REFERENCES aws_accounts (aws_account_id) NOT NULL,
	time_start TIMESTAMP NOT NULL,
	time_end TIMESTAMP NOT NULL,
	service TEXT NOT NULL,
	region TEXT NOT NULL,
	total_cost DECIMAL NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RESOURCES TABLE

CREATE TABLE resources (
	resource_id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
	aws_account_id VARCHAR(12) REFERENCES aws_accounts (aws_account_id) NOT NULL,
	service TEXT NOT NULL,
	instance_type TEXT NOT NULL,
	region TEXT NOT NULL,
	last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- COST_ANOMALIES TABLE

CREATE TABLE cost_anomalies (
	anomaly_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	daily_cost_id UUID REFERENCES daily_cost_summaries (daily_cost_id) NOT NULL,
	aws_account_id VARCHAR(12) REFERENCES aws_accounts (aws_account_id) NOT NULL,
	resource_id TEXT REFERENCES resources (resource_id) NOT NULL,
	detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	expected_cost DECIMAL NOT NULL,
	deviation_pct DECIMAL NOT NULL,
	severity INT NOT NULL, 
	model_version TEXT NOT NULL
);

-- RECOMMENDATIONS TABLE

CREATE TABLE recommendations (
	recommendation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	aws_account_id VARCHAR(12) REFERENCES aws_accounts (aws_account_id )NOT NULL,
	resource_id TEXT REFERENCES resources (resource_id) NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, 
	recommendation_type TEXT NOT NULL, 
	description TEXT NOT NULL,
	estimated_monthly_savings DECIMAL NOT NULL, 
	confidence_score DECIMAL NOT NULL,
	status INTEGER
);

-- AUDIT_LOGS TABLES

CREATE TABLE audit_logs (
	audit_log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	team_id  UUID REFERENCES teams (team_id) NOT NULL,
	user_id UUID REFERENCES users (user_id) NOT NULL,
	action TEXT NOT NULL,
	details JSONB NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);