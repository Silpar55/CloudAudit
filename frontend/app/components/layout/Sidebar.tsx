import React, { useState, useMemo, useEffect } from "react";
import {
  Cloud,
  ChevronDown,
  Home,
  BarChart3,
  AlertTriangle,
  TrendingDown,
  Boxes,
  ChevronRight,
  Server,
  HardDrive,
  Database,
  Activity,
  Users,
  FileBarChart,
  Settings,
  ChevronUp,
  Globe,
  Cpu,
  Layers,
  Network,
  Shield,
  BarChart2,
  Box,
  Zap,
} from "lucide-react";
import { getAvatarColor, getInitials } from "~/utils/format";
import { Link, useNavigate } from "react-router";
import { useGetTeamsByUserId } from "~/hooks/useTeam";
import { useGetCachedCostData } from "~/hooks/useAws";

import { useAwsAccount } from "~/context/AwsAccountContext";
import { useGetAnomalies } from "~/hooks/useAnomaly";
import { useRecommendations } from "~/hooks/useRecommendations";
import { useParams } from "react-router";

// ─── Service name → { label, Icon } map ──────────────────────────────────────
// Keys are substrings of the full AWS Cost Explorer display names.
// Matched in order — first hit wins.

interface ServiceMeta {
  label: string;
  Icon: React.ElementType;
  slug: string;
}

const SERVICE_MAP: Array<{ match: string; meta: ServiceMeta }> = [
  {
    match: "Elastic Compute Cloud",
    meta: { label: "EC2", Icon: Server, slug: "ec2" },
  },
  {
    match: "Relational Database Service",
    meta: { label: "RDS", Icon: HardDrive, slug: "rds" },
  },
  {
    match: "Simple Storage Service",
    meta: { label: "S3", Icon: Database, slug: "s3" },
  },
  {
    match: "Lambda",
    meta: { label: "Lambda", Icon: Zap, slug: "lambda" },
  },
  {
    match: "CloudFront",
    meta: { label: "CloudFront", Icon: Globe, slug: "cloudfront" },
  },
  {
    match: "DynamoDB",
    meta: { label: "DynamoDB", Icon: Layers, slug: "dynamodb" },
  },
  {
    match: "Elastic Container",
    meta: { label: "ECS/EKS", Icon: Box, slug: "ecs" },
  },
  {
    match: "Elastic Kubernetes",
    meta: { label: "EKS", Icon: Box, slug: "eks" },
  },
  {
    match: "ElastiCache",
    meta: { label: "ElastiCache", Icon: Cpu, slug: "elasticache" },
  },
  {
    match: "Virtual Private Cloud",
    meta: { label: "VPC", Icon: Network, slug: "vpc" },
  },
  {
    match: "Route 53",
    meta: { label: "Route 53", Icon: Globe, slug: "route53" },
  },
  {
    match: "CloudWatch",
    meta: { label: "CloudWatch", Icon: Activity, slug: "cloudwatch" },
  },
  {
    match: "Key Management",
    meta: { label: "KMS", Icon: Shield, slug: "kms" },
  },
  {
    match: "Simple Notification",
    meta: { label: "SNS", Icon: BarChart2, slug: "sns" },
  },
  {
    match: "Simple Queue",
    meta: { label: "SQS", Icon: BarChart2, slug: "sqs" },
  },
  {
    match: "Elastic Load Balancing",
    meta: { label: "ELB", Icon: Network, slug: "elb" },
  },
  {
    match: "API Gateway",
    meta: { label: "API Gateway", Icon: Network, slug: "apigateway" },
  },
  {
    match: "Redshift",
    meta: { label: "Redshift", Icon: Database, slug: "redshift" },
  },
  {
    match: "Glue",
    meta: { label: "Glue", Icon: Layers, slug: "glue" },
  },
  {
    match: "Athena",
    meta: { label: "Athena", Icon: BarChart2, slug: "athena" },
  },
];

const resolveService = (fullName: string): ServiceMeta => {
  const hit = SERVICE_MAP.find((s) =>
    fullName.toLowerCase().includes(s.match.toLowerCase()),
  );
  if (hit) return hit.meta;
  // Fallback: abbreviate to first letters of each word, max 4 chars
  const abbr = fullName
    .replace(/^Amazon\s+/i, "")
    .replace(/^AWS\s+/i, "")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 4);
  return {
    label: abbr || fullName.slice(0, 8),
    Icon: Boxes,
    slug: abbr.toLowerCase(),
  };
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────

/**
 * Sidebar Component
 *
 * @param currentTeam  - Active team object { team_id, name, status }
 * @param user         - Authenticated user { first_name, last_name }
 * @param role         - Member role in current team ("owner" | "admin" | "member")
 * @param counts       - { anomalies: number, recommendations: number } — pass real values when ML is ready, 0 in the meantime
 * @param awsAccountInternalId - aws_accounts.id UUID (needed to load resource list from cost cache)
 * @param activeRoute  - Current path string
 * @param onNavigate   - Optional navigation callback
 */
const Sidebar = ({
  currentTeam,
  user,
  role,
  counts,
  activeRoute = "/",
  onNavigate,
  className = "",
  ...props
}: any) => {
  const [resourcesExpanded, setResourcesExpanded] = useState(true);
  const [teamsExpanded, setTeamsExpanded] = useState(false);
  const navigate = useNavigate();

  const handleNavigation = (path: string) => {
    if (onNavigate) return onNavigate(path);
  };

  const handleTeamSwitch = (teamId: string) => {
    navigate(`teams/${teamId}`);
  };

  const userAvatarColor = getAvatarColor(user.first_name);
  const userInitials = (user.first_name[0] || "") + (user.last_name[0] || "");

  const { data: teamsData } = useGetTeamsByUserId();

  // ── AWS account from context — fetched once in the layout ────────────────
  const { account } = useAwsAccount();
  const awsAccountInternalId = account?.id;

  const { data: anomalies = [] } = useGetAnomalies(
    currentTeam?.team_id,
    awsAccountInternalId,
  );
  const { recommendations } = useRecommendations(
    currentTeam?.team_id,
    account?.id,
  );

  const anomalyCount = anomalies.length;
  const pendingCount = recommendations.filter(
    (r) => r.status === "pending",
  ).length;

  // ── Dynamic resource list from cost explorer cache ──────────────────────
  // Pull last 90 days so we catch historically used services even if
  // they're no longer generating cost today.
  const ninetyDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d.toISOString().split("T")[0];
  }, []);
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Added refetch extraction here
  const { data: costRows = [], refetch } = useGetCachedCostData(
    currentTeam?.team_id,
    awsAccountInternalId,
    ninetyDaysAgo,
    todayStr,
    { enabled: !!awsAccountInternalId && currentTeam?.status === "active" },
  );

  // ── FIX: Synchronize sidebar with Dashboard's initial sync ─────────────────
  // Because the dashboard runs the initial AWS sync asynchronously, the sidebar's
  // 90-day cache query might fire while the DB is still empty.
  // This polls the local cache every 3 seconds until the data arrives.
  useEffect(() => {
    if (currentTeam?.status !== "active" || !awsAccountInternalId) return;
    if (costRows.length > 0) return;

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      refetch();
      // Stop polling after 30 seconds (10 attempts) to prevent infinite loops on truly empty accounts
      if (attempts >= 10) clearInterval(interval);
    }, 3000);

    return () => clearInterval(interval);
  }, [currentTeam?.status, awsAccountInternalId, costRows.length, refetch]);

  // Deduplicate services and resolve to { label, Icon, slug }
  const resourceServices = useMemo(() => {
    const seen = new Set<string>();
    const result: ServiceMeta[] = [];
    for (const row of costRows) {
      if (!seen.has(row.service)) {
        seen.add(row.service);
        result.push(resolveService(row.service));
      }
    }
    // Sort alphabetically by label
    return result.sort((a, b) => a.label.localeCompare(b.label));
  }, [costRows]);

  // ── Nav components ────────────────────────────────────────────────────────

  const NavLink = ({
    href,
    icon: Icon,
    label,
    badge,
    badgeVariant = "red",
  }: any) => {
    const isActive = activeRoute === href;
    return (
      <Link
        to={handleNavigation(href)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all ${
          isActive
            ? "bg-aws-orange text-white font-semibold"
            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
        }`}
      >
        <Icon className="w-5 h-5 shrink-0" />
        <span className="text-sm flex-1">{label}</span>
        {badge != null && badge > 0 && (
          <span
            className={`px-2 py-0.5 text-xs font-bold rounded-full ${
              isActive
                ? "bg-white/20 text-white"
                : badgeVariant === "green"
                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
            }`}
          >
            {badge}
          </span>
        )}
      </Link>
    );
  };

  const ResourceLink = ({ slug, Icon, label }: any) => {
    const href = `/resources/${slug}`;
    const isActive = activeRoute === href;
    return (
      <Link
        to={href}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group ${
          isActive
            ? "bg-aws-orange/10 text-aws-orange font-semibold"
            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
        }`}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="flex-1 truncate">{label}</span>
      </Link>
    );
  };

  return (
    <aside
      className={`w-72 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 flex flex-col ${className}`}
      {...props}
    >
      {/* ── Logo + Team Switcher ─────────────────────────────────────────── */}
      <div className="p-6 border-b border-gray-200 dark:border-slate-700">
        <Link to="/">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-linear-to-br from-aws-orange to-brand-coral rounded-xl flex items-center justify-center">
              <Cloud className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold font-display text-gray-900 dark:text-white">
              Cloud<span className="text-aws-orange">Audit</span>
            </span>
          </div>
        </Link>

        {/* Team Selector */}
        <div className="relative">
          <button
            onClick={() => setTeamsExpanded(!teamsExpanded)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-lg bg-linear-to-br ${getAvatarColor(currentTeam.name)} flex items-center justify-center text-white text-sm font-semibold`}
              >
                {getInitials(currentTeam.name)}
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-32">
                  {currentTeam.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Switch workspace
                </div>
              </div>
            </div>
            {teamsExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
            )}
          </button>

          {teamsExpanded && (
            <div className="absolute mt-2 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg py-2 z-50">
              {teamsData?.teams
                ?.filter((t: any) => t.team_id !== currentTeam.team_id)
                .map((team: any) => (
                  <button
                    key={team.team_id}
                    onClick={() => handleTeamSwitch(team.team_id)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg bg-linear-to-br ${getAvatarColor(team.name)} flex items-center justify-center text-white text-sm font-semibold`}
                    >
                      {getInitials(team.name)}
                    </div>
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                      {team.name}
                    </div>
                  </button>
                ))}
              {(!teamsData?.teams ||
                teamsData.teams.filter(
                  (t: any) => t.team_id !== currentTeam.team_id,
                ).length === 0) && (
                <p className="px-3 py-2 text-xs text-gray-400 text-center">
                  No other workspaces
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Navigation ──────────────────────────────────────────────────── */}
      <nav className="flex-1 p-4 overflow-y-auto">
        {currentTeam.status !== "aws_required" ? (
          <div className="space-y-1">
            {/* Analytics */}
            <SectionLabel>Analytics</SectionLabel>
            <NavLink href="/" icon={Home} label="Overview" />
            <NavLink
              href="/cost-explorer"
              icon={BarChart3}
              label="Cost Explorer"
            />

            {/* AI Intelligence */}
            <SectionLabel className="mt-6">AI Intelligence</SectionLabel>
            <NavLink
              href="/anomalies"
              icon={AlertTriangle}
              label="Anomalies"
              badge={anomalyCount}
              badgeVariant="red"
            />
            <NavLink
              href="/recommendations"
              icon={TrendingDown}
              label="Recommendations"
              badge={pendingCount}
              badgeVariant="green"
            />

            {/* Resources — dynamic */}
            <SectionLabel className="mt-6">Resources</SectionLabel>

            <button
              onClick={() => setResourcesExpanded(!resourcesExpanded)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg font-medium transition-all"
            >
              <Boxes className="w-5 h-5 shrink-0" />
              <span className="text-sm flex-1 text-left">AWS Services</span>
              {resourceServices.length > 0 && (
                <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-md mr-1">
                  {resourceServices.length}
                </span>
              )}
              {resourcesExpanded ? (
                <ChevronDown className="w-4 h-4 shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 shrink-0" />
              )}
            </button>

            {resourcesExpanded && (
              <div className="ml-6 space-y-0.5 border-l-2 border-gray-200 dark:border-slate-700 pl-2">
                {resourceServices.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-gray-400">
                    No services detected yet.
                  </p>
                ) : (
                  resourceServices.map((svc) => (
                    <ResourceLink
                      key={svc.slug}
                      slug={svc.slug}
                      Icon={svc.Icon}
                      label={svc.label}
                    />
                  ))
                )}
              </div>
            )}

            {/* Management */}
            <SectionLabel className="mt-6">Management</SectionLabel>
            <NavLink href="/members" icon={Users} label="Team Members" />
            {(role === "admin" || role === "owner") && (
              <NavLink
                href="/audit-logs"
                icon={FileBarChart}
                label="Audit Logs"
              />
            )}
            <NavLink href="/settings" icon={Settings} label="Settings" />
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                AWS Setup Required
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Configure your AWS account to access workspace navigation.
              </p>
            </div>
          </div>
        )}
      </nav>

      {/* ── User Profile ─────────────────────────────────────────────────── */}
      <div className="p-4 border-t border-gray-200 dark:border-slate-700">
        <Link
          to="/profile"
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div
            className={`w-10 h-10 bg-linear-to-br ${userAvatarColor} rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0`}
          >
            {userInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {user.first_name} {user.last_name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate capitalize">
              {role}
            </p>
          </div>
        </Link>
      </div>
    </aside>
  );
};

// ─── Small helper ─────────────────────────────────────────────────────────────

const SectionLabel = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`px-3 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ${className}`}
  >
    {children}
  </div>
);

export default Sidebar;
