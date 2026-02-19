-- Database: cloudaudit v6.0

-- DROP FIRST TABLES WITH FOREIGN KEYS
DROP TABLE IF EXISTS cost_anomalies;
DROP TABLE IF EXISTS cost_data;
DROP TABLE IF EXISTS daily_cost_summaries;
DROP TABLE IF EXISTS cost_explorer_cache;
DROP TABLE IF EXISTS recommendations;
DROP TABLE IF EXISTS resources;
DROP TABLE IF EXISTS aws_accounts;
DROP TABLE IF EXISTS team_members;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS teams;
DROP TYPE IF EXISTS aws_account_status
DROP TYPE IF EXISTS team_status

CREATE TYPE aws_account_status AS ENUM (
    'role_provided',
    'testing',
    'active',
    'failed',
    'disconnected'
);

CREATE TYPE team_status AS ENUM (
    'aws_required',
    'active',
    'suspended'
);

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
    team_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,

    status team_status NOT NULL DEFAULT 'aws_required',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- TEAM_MEMBERS TABLE

CREATE TABLE team_members (
	team_member_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	
	team_id UUID NOT NULL
		REFERENCES teams (team_id)
		ON DELETE CASCADE,
	
	user_id UUID NOT NULL
		REFERENCES users (user_id)
		ON DELETE CASCADE,
	
	role TEXT NOT NULL
	CHECK (role IN ('owner', 'admin', 'member')),

	is_active BOOL NOT NULL DEFAULT TRUE,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
	
	UNIQUE (team_id, user_id)
);


-- AWS_ACCOUNT TABLE

CREATE TABLE aws_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    team_id UUID NOT NULL
        REFERENCES teams (team_id)
        ON DELETE CASCADE,

    aws_account_id VARCHAR(12) UNIQUE,

    external_id UUID NOT NULL DEFAULT gen_random_uuid(),
    iam_role_arn TEXT NOT NULL,

    status aws_account_status NOT NULL DEFAULT 'role_provided',

    last_tested_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,

    connected_at TIMESTAMP WITH TIME ZONE,
    disconnected_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(team_id)
);



-- COST_DATA TABLE

CREATE TABLE cost_data (
    cost_data_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aws_account_id UUID REFERENCES aws_accounts(id) NOT NULL,
    time_interval TIMESTAMP NOT NULL,
    product_code TEXT NOT NULL,
    usage_type TEXT NOT NULL,
    operation TEXT NOT NULL,
    resource_id TEXT,  -- NULLABLE: some line items don't have resource_id
    usage_amount DECIMAL NOT NULL,
    unblended_cost DECIMAL NOT NULL,
    region TEXT,  -- NULLABLE: some services are global
    instance_type TEXT,  -- NULLABLE: not applicable to all services
    pricing_unit TEXT,
    usage_unit TEXT, 
    public_cost DECIMAL,  -- NULLABLE
    blended_cost DECIMAL NOT NULL,
    amortized_cost DECIMAL NOT NULL,
    tag_environment TEXT,  -- NULLABLE
    tag_project TEXT,  -- NULLABLE
    tag_owner TEXT,  -- NULLABLE
    bill_period DATE NOT NULL,
    loaded_at TIMESTAMP DEFAULT NOW()
);


-- DAILY_COST_SUMMARIES TABLE

CREATE TABLE daily_cost_summaries (
    daily_cost_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aws_account_id UUID REFERENCES aws_accounts(id) NOT NULL,
    time_period_start TIMESTAMP NOT NULL,
    time_period_end TIMESTAMP NOT NULL,
    service TEXT NOT NULL,
    region TEXT NOT NULL,
    total_cost DECIMAL NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Add source tracking
    data_source VARCHAR(20) DEFAULT 'cur' CHECK (data_source IN ('cur', 'cost_explorer')),
    -- Prevent duplicates
    UNIQUE(aws_account_id, time_period_start, service, region, data_source)
);

-- NEW: Cost Explorer cache for real-time/recent data

CREATE TABLE cost_explorer_cache (
    cache_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aws_account_id UUID REFERENCES aws_accounts(id) NOT NULL,
    time_period_start DATE NOT NULL,
    time_period_end DATE NOT NULL,
    service TEXT NOT NULL,
    region TEXT NOT NULL,
    unblended_cost DECIMAL NOT NULL,
	unblended_unit TEXT NOT NULL,
    usage_quantity DECIMAL,
	usage_quantity_unit TEXT,
    retrieved_at TIMESTAMP DEFAULT NOW(),
    -- Cache expiry tracking
    is_stale BOOLEAN DEFAULT FALSE,
    UNIQUE(aws_account_id, time_period_start, service, region)
);

-- RESOURCES TABLE

CREATE TABLE resources (
	resource_id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
	aws_account_id UUID REFERENCES aws_accounts(id)
		ON DELETE CASCADE,
	service TEXT NOT NULL,
	instance_type TEXT NOT NULL,
	region TEXT NOT NULL,
	last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- COST_ANOMALIES TABLE

CREATE TABLE cost_anomalies (
	anomaly_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	daily_cost_id UUID REFERENCES daily_cost_summaries (daily_cost_id) NOT NULL,
	aws_account_id UUID REFERENCES aws_accounts(id) NOT NULL,
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
	aws_account_id UUID REFERENCES aws_accounts(id) NOT NULL,
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