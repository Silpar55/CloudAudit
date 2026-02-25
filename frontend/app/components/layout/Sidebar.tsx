import React, { useState } from "react";
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
  Plus,
  ChevronUp,
} from "lucide-react";
import { getAvatarColor, getInitials } from "~/utils/format";
import { Link, useNavigate } from "react-router";
import { useGetTeamsByUserId } from "~/hooks/useTeam";

/**
 * Sidebar Component
 *
 * Collapsible sidebar navigation for team workspace
 *
 * @param {Object} team - Team data {name, initials, memberCount, avatarColor}
 * @param {Object} user - User data {name, initials, role, avatarColor}
 * @param {Object} counts - Notification counts {anomalies, recommendations}
 * @param {string} activeRoute - Current active route
 * @param {function} onNavigate - Navigation handler
 * @param {string} className - Additional CSS classes
 */

const Sidebar = ({
  currentTeam,
  user,
  role,
  counts = { anomalies: 0, recommendations: 0 },
  activeRoute = "/",
  onNavigate,
  className = "",
  ...props
}: any) => {
  const [resourcesExpanded, setResourcesExpanded] = useState(true);
  const [teamsExpanded, setTeamsExpanded] = useState(false);
  const navigate = useNavigate();
  const handleNavigation = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    }
  };

  const handleTeamSwitch = (teamId: string) => {
    navigate(`teams/${teamId}`);
  };

  const userAvatarColor = getAvatarColor(user.first_name);
  const userInitials = (user.first_name[0] || "") + (user.last_name[0] || "");

  const { data } = useGetTeamsByUserId();

  const NavLink = ({ href, icon: Icon, label, badge, children }: any) => {
    const isActive = activeRoute === href;

    return (
      <Link
        to={href}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all ${
          isActive
            ? "bg-aws-orange text-white font-semibold"
            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
        }`}
      >
        <Icon className="w-5 h-5" />
        <span className="text-sm flex-1">{label}</span>
        {badge && (
          <span
            className={`px-2 py-0.5 text-xs font-bold rounded-full ${
              isActive
                ? "bg-white/20 text-white"
                : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
            }`}
          >
            {badge}
          </span>
        )}
      </Link>
    );
  };

  const ResourceLink = ({ href, icon: Icon, label, badge }: any) => {
    return (
      <a
        href={href}
        onClick={(e) => {
          e.preventDefault();
          handleNavigation(href);
        }}
        className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-sm transition-all group"
      >
        <Icon className="w-4 h-4" />
        <span className="flex-1">{label}</span>
        {badge && (
          <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity">
            {badge}
          </span>
        )}
      </a>
    );
  };

  return (
    <aside
      className={`w-72 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 flex flex-col ${className}`}
      {...props}
    >
      <div className="p-6 border-b border-gray-200 dark:border-slate-700">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-linear-to-br from-aws-orange to-brand-coral rounded-xl flex items-center justify-center">
            <Cloud className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold font-display text-gray-900 dark:text-white">
            Cloud<span className="text-aws-orange">Audit</span>
          </span>
        </div>

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
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {currentTeam.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Switch workspace
                </div>
              </div>
            </div>

            {teamsExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>

          {/* Dropdown */}
          {teamsExpanded && (
            <div className="absolute mt-2 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg py-2 z-50">
              {data &&
                data.teams.map((team: any) => {
                  if (team.team_id === currentTeam.team_id) return;
                  return (
                    <button
                      key={team.team_id}
                      onClick={() => handleTeamSwitch(team.team_id)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <div
                        className={`w-8 h-8 rounded-lg bg-linear-to-br  ${getAvatarColor(team.name)} flex items-center justify-center text-white text-sm font-semibold`}
                      >
                        {getInitials(team.name)}
                      </div>

                      <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {team.name}
                      </div>
                    </button>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        {currentTeam.status !== "aws_required" ? (
          <div className="space-y-1">
            {/* Analytics Section */}
            <div className="px-3 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Analytics
            </div>
            <NavLink href="/" icon={Home} label="Overview" />
            <NavLink href="/aws" icon={BarChart3} label="Cost Explorer" />

            {/* AI Intelligence Section */}
            <div className="px-3 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-6">
              AI Intelligence
            </div>
            <NavLink
              href="/anomalies"
              icon={AlertTriangle}
              label="Anomalies"
              badge={counts.anomalies > 0 ? counts.anomalies : null}
            />
            <NavLink
              href="/recommendations"
              icon={TrendingDown}
              label="Recommendations"
              badge={counts.recommendations > 0 ? counts.recommendations : null}
            />

            {/* Resources Section - Collapsible */}
            <div className="px-3 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-6">
              Resources
            </div>

            <button
              onClick={() => setResourcesExpanded(!resourcesExpanded)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg font-medium transition-all"
            >
              <Boxes className="w-5 h-5" />
              <span className="text-sm flex-1 text-left">AWS Services</span>
              {resourcesExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            {/* Resources List */}
            {resourcesExpanded && (
              <div className="ml-6 space-y-1 border-l-2 border-gray-200 dark:border-slate-700 pl-2">
                <ResourceLink
                  href="/resources/ec2"
                  icon={Server}
                  label="EC2 Instances"
                  badge={1}
                />
                <ResourceLink
                  href="/resources/rds"
                  icon={HardDrive}
                  label="RDS Databases"
                  badge={1}
                />
                <ResourceLink
                  href="/resources/s3"
                  icon={Database}
                  label="S3 Buckets"
                />
                <ResourceLink
                  href="/resources/lambda"
                  icon={Activity}
                  label="Lambda Functions"
                />
              </div>
            )}

            {/* Management Section */}
            <div className="px-3 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-6">
              Management
            </div>
            <NavLink href="/members" icon={Users} label="Team Members" />
            <NavLink
              href="/audit-logs"
              icon={FileBarChart}
              label="Audit Logs"
            />
            <NavLink href="/settings" icon={Settings} label="Settings" />
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                AWS Setup Required
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                You must configure your AWS account before accessing workspace
                navigation.
              </p>
            </div>
          </div>
        )}
      </nav>
      {/* User Profile */}
      <div className="p-4 border-t border-gray-200 dark:border-slate-700">
        <a
          href="/profile"
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div
            className={`w-10 h-10 bg-linear-to-br ${userAvatarColor} rounded-lg flex items-center justify-center text-white font-bold text-sm`}
          >
            {userInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {user.first_name} {user.last_name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {role}
            </p>
          </div>
        </a>
      </div>
    </aside>
  );
};

export default Sidebar;
