-- For databases created before team_dashboard_view + team_members notification columns were merged into 001.
-- Safe to run once if those objects already match 001 (CREATE OR REPLACE / IF NOT EXISTS patterns).

ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS notify_analysis_email BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS analysis_prefs_prompted BOOLEAN NOT NULL DEFAULT FALSE;

-- Grandfather existing members: keep analysis emails on, skip first-run modal
UPDATE team_members
SET notify_analysis_email = TRUE,
    analysis_prefs_prompted = TRUE;

-- Replace view (full definition must match application)
DROP VIEW IF EXISTS team_dashboard_view;
CREATE VIEW team_dashboard_view AS
SELECT
    t.team_id,
    t.name,
    t.description,
    t.status,
    (
        SELECT COUNT(*)::int
        FROM team_members tm2
        WHERE tm2.team_id = t.team_id
          AND tm2.is_active = TRUE
    ) AS member_count,
    (
        SELECT MAX(aa.aws_account_id)::varchar(12)
        FROM aws_accounts aa
        WHERE aa.team_id = t.team_id
          AND aa.status = 'active'
    ) AS aws_account_id,
    (
        SELECT MAX(aa.status)::text
        FROM aws_accounts aa
        WHERE aa.team_id = t.team_id
    ) AS aws_status,
    COALESCE(
        NULLIF(
            (
                SELECT SUM(dcs.total_cost)::numeric
                FROM daily_cost_summaries dcs
                INNER JOIN aws_accounts aa ON aa.id = dcs.aws_account_id
                WHERE aa.team_id = t.team_id
                  AND date_trunc('month', dcs.time_period_start::timestamp) =
                      date_trunc('month', CURRENT_TIMESTAMP)
            ),
            0
        ),
        (
            SELECT COALESCE(SUM(cec.unblended_cost), 0)::numeric
            FROM cost_explorer_cache cec
            INNER JOIN aws_accounts aa ON aa.id = cec.aws_account_id
            WHERE aa.team_id = t.team_id
              AND cec.time_period_start >= date_trunc('month', CURRENT_DATE)::date
              AND cec.time_period_start <
                  (date_trunc('month', CURRENT_DATE) + interval '1 month')::date
        ),
        0
    ) AS monthly_cost,
    COALESCE(
        (
            SELECT MAX(cec.unblended_unit)
            FROM cost_explorer_cache cec
            INNER JOIN aws_accounts aa ON aa.id = cec.aws_account_id
            WHERE aa.team_id = t.team_id
              AND cec.time_period_start >= date_trunc('month', CURRENT_DATE)::date
              AND cec.time_period_start <
                  (date_trunc('month', CURRENT_DATE) + interval '1 month')::date
        ),
        'USD'
    ) AS billing_currency
FROM teams t;
