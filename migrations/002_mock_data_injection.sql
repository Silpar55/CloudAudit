-- ==============================================================================
-- CloudAudit v6.0 - Mock Data Injection Script (Schema Aligned)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. MOCK USERS (All passwords: 'Test_11!' - Hashed with Bcrypt Cost 10)
-- email_verified set to TRUE to allow immediate UI login
INSERT INTO users (user_id, first_name, last_name, email, email_verified, password, phone, country_code, is_active, created_at) VALUES
('11111111-1111-4111-a111-111111111111', 'Alejandro', 'Silva', 'asilva.tech@gmail.com', TRUE, crypt('Test_11!', gen_salt('bf', 10)), '5550100', 'CA', TRUE, NOW()),
('22222222-2222-4222-a222-222222222222', 'Sarah', 'Connor', 's.connor@stabletech.com', TRUE, crypt('Test_11!', gen_salt('bf', 10)), '5550101', 'US', TRUE, NOW()),
('33333333-3333-4333-a333-333333333333', 'Marcus', 'Wright', 'm.wright@spikecorp.com', TRUE, crypt('Test_11!', gen_salt('bf', 10)), '5550102', 'US', TRUE, NOW()),
('44444444-4444-4444-a444-444444444444', 'Elena', 'Rust', 'elena@spikecorp.com', TRUE, crypt('Test_11!', gen_salt('bf', 10)), '5550103', 'UK', TRUE, NOW()),
('55555555-5555-4555-a555-555555555555', 'David', 'Kim', 'dkim@spikecorp.com', TRUE, crypt('Test_11!', gen_salt('bf', 10)), '5550104', 'CA', TRUE, NOW()),
('66666666-6666-4666-a666-666666666666', 'Priya', 'Patel', 'priya@volatilelabs.io', TRUE, crypt('Test_11!', gen_salt('bf', 10)), '5550105', 'IN', TRUE, NOW()),
('77777777-7777-4777-a777-777777777777', 'James', 'Holden', 'jholden@volatilelabs.io', TRUE, crypt('Test_11!', gen_salt('bf', 10)), '5550106', 'US', TRUE, NOW()),
('88888888-8888-4888-a888-888888888888', 'Naomi', 'Nagata', 'naomi@volatilelabs.io', TRUE, crypt('Test_11!', gen_salt('bf', 10)), '5550107', 'JP', TRUE, NOW()),
('99999999-9999-4999-a999-999999999999', 'Amos', 'Burton', 'amos@volatilelabs.io', TRUE, crypt('Test_11!', gen_salt('bf', 10)), '5550108', 'US', TRUE, NOW()),
('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', 'Chrisjen', 'Avasarala', 'chrisjen@volatilelabs.io', TRUE, crypt('Test_11!', gen_salt('bf', 10)), '5550109', 'IN', TRUE, NOW());

-- 2. MOCK TEAMS
INSERT INTO teams (team_id, name, status, created_at) VALUES
('bbbbbbbb-1111-4bbb-abbb-111111111111', 'StableTech Systems', 'active', NOW()),
('bbbbbbbb-2222-4bbb-abbb-222222222222', 'SpikeCorp Innovations', 'active', NOW()),
('bbbbbbbb-3333-4bbb-abbb-333333333333', 'VolatileLabs R&D', 'active', NOW());

-- 3. TEAM MEMBERS (Distribution: 2, 3, 5)
INSERT INTO team_members (team_member_id, team_id, user_id, role, is_active, created_at) VALUES
-- Team 1 (2 Users)
(gen_random_uuid(), 'bbbbbbbb-1111-4bbb-abbb-111111111111', '11111111-1111-4111-a111-111111111111', 'owner', TRUE, NOW()),
(gen_random_uuid(), 'bbbbbbbb-1111-4bbb-abbb-111111111111', '22222222-2222-4222-a222-222222222222', 'admin', TRUE, NOW()),
-- Team 2 (3 Users)
(gen_random_uuid(), 'bbbbbbbb-2222-4bbb-abbb-222222222222', '33333333-3333-4333-a333-333333333333', 'owner', TRUE, NOW()),
(gen_random_uuid(), 'bbbbbbbb-2222-4bbb-abbb-222222222222', '44444444-4444-4444-a444-444444444444', 'admin', TRUE, NOW()),
(gen_random_uuid(), 'bbbbbbbb-2222-4bbb-abbb-222222222222', '55555555-5555-4555-a555-555555555555', 'member', TRUE, NOW()),
-- Team 3 (5 Users)
(gen_random_uuid(), 'bbbbbbbb-3333-4bbb-abbb-333333333333', '66666666-6666-4666-a666-666666666666', 'owner', TRUE, NOW()),
(gen_random_uuid(), 'bbbbbbbb-3333-4bbb-abbb-333333333333', '77777777-7777-4777-a777-777777777777', 'admin', TRUE, NOW()),
(gen_random_uuid(), 'bbbbbbbb-3333-4bbb-abbb-333333333333', '88888888-8888-4888-a888-888888888888', 'member', TRUE, NOW()),
(gen_random_uuid(), 'bbbbbbbb-3333-4bbb-abbb-333333333333', '99999999-9999-4999-a999-999999999999', 'member', TRUE, NOW()),
(gen_random_uuid(), 'bbbbbbbb-3333-4bbb-abbb-333333333333', 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', 'member', TRUE, NOW());

-- 4. AWS ACCOUNTS (Using 'id' UUID as Primary Key)
INSERT INTO aws_accounts (id, team_id, aws_account_id, external_id, iam_role_arn, status, connected_at) VALUES
('11111111-aaaa-4111-a111-111111111111', 'bbbbbbbb-1111-4bbb-abbb-111111111111', '111122223333', gen_random_uuid(), 'arn:aws:iam::111122223333:role/CloudAuditRole', 'active', NOW() - INTERVAL '65 days'),
('22222222-bbbb-4222-a222-222222222222', 'bbbbbbbb-2222-4bbb-abbb-222222222222', '444455556666', gen_random_uuid(), 'arn:aws:iam::444455556666:role/CloudAuditRole', 'active', NOW() - INTERVAL '65 days'),
('33333333-cccc-4333-a333-333333333333', 'bbbbbbbb-3333-4bbb-abbb-333333333333', '777788889999', gen_random_uuid(), 'arn:aws:iam::777788889999:role/CloudAuditRole', 'active', NOW() - INTERVAL '65 days');

-- 5. MOCK RESOURCES
INSERT INTO resources (resource_id, aws_account_id, service, instance_type, region, last_seen) VALUES
('i-0abcd1234efgh5678', '11111111-aaaa-4111-a111-111111111111', 'AmazonEC2', 't3.micro', 'ca-central-1', NOW()),
('i-0xyza9876lmno5432', '22222222-bbbb-4222-a222-222222222222', 'AmazonEC2', 'm5.large', 'us-east-1', NOW()),
('db-XYZ123ABC987DEF', '33333333-cccc-4333-a333-333333333333', 'AmazonRDS', 'db.r5.xlarge', 'us-west-2', NOW());

-- 6. DAILY COST SUMMARIES (The ML Training Data - 60 Days)

-- Scenario 1: The Stable Baseline
INSERT INTO daily_cost_summaries (daily_cost_id, aws_account_id, time_period_start, time_period_end, service, region, total_cost, created_at)
SELECT 
    gen_random_uuid(), '11111111-aaaa-4111-a111-111111111111', d, d + INTERVAL '23 hours 59 minutes 59 seconds', 'AmazonEC2', 'ca-central-1',
    15.00 + (random() * 1.00 - 0.50), NOW()
FROM generate_series(CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE - INTERVAL '1 day', '1 day') AS d;

-- Scenario 2: The Problem Child / Spikes
INSERT INTO daily_cost_summaries (daily_cost_id, aws_account_id, time_period_start, time_period_end, service, region, total_cost, created_at)
SELECT 
    gen_random_uuid(), '22222222-bbbb-4222-a222-222222222222', d, d + INTERVAL '23 hours 59 minutes 59 seconds', 'AmazonEC2', 'us-east-1',
    CASE 
        WHEN EXTRACT(DAY FROM d) IN (12, 13) THEN 240.00 + random() * 15.00
        WHEN EXTRACT(DAY FROM d) IN (28) THEN 190.00 + random() * 10.00
        ELSE 40.00 + (random() * 2.00)
    END, 
    NOW()
FROM generate_series(CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE - INTERVAL '1 day', '1 day') AS d;

-- Scenario 3: The Volatile Wildcard
INSERT INTO daily_cost_summaries (daily_cost_id, aws_account_id, time_period_start, time_period_end, service, region, total_cost, created_at)
SELECT 
    gen_random_uuid(), '33333333-cccc-4333-a333-333333333333', d, d + INTERVAL '23 hours 59 minutes 59 seconds', 'AmazonRDS', 'us-west-2',
    130.00 + (random() * 100.00 - 50.00), NOW()
FROM generate_series(CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE - INTERVAL '1 day', '1 day') AS d;