import React from "react";
import { Users, Cloud } from "lucide-react";

/**
 * TeamCard Component
 *
 * Display team information with AWS connection status
 *
 * @param {string} name - Team name
 * @param {string} description - Team description
 * @param {string} initials - Team initials for avatar
 * @param {string} avatarColor - Avatar gradient colors
 * @param {number} memberCount - Number of team members
 * @param {string} awsAccountId - AWS account ID (if connected)
 * @param {string} monthlyCost - Monthly cost
 * @param {string} status - Team status (active, setup_needed)
 * @param {function} onClick - Click handler
 * @param {string} className - Additional CSS classes
 */

const TeamCard = ({
  name,
  description = "",
  initials = "TM",
  avatarColor = "from-purple-500 to-purple-600",
  memberCount = 0,
  awsAccountId = "",
  monthlyCost = "",
  status = "active",
  onClick,
  className = "",
  ...props
}: any) => {
  const statusConfig: any = {
    active: {
      badge:
        "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
      label: "Active",
    },
    setup_needed: {
      badge:
        "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400",
      label: "Setup Needed",
    },
    inactive: {
      badge: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300",
      label: "Inactive",
    },
  };

  const config = statusConfig[status];

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-slate-700 hover:shadow-xl hover:border-aws-orange/30 transition-all cursor-pointer group ${className}`}
      {...props}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-12 h-12 bg-linear-to-br ${avatarColor} rounded-xl flex items-center justify-center text-white font-bold text-xl`}
        >
          {initials}
        </div>
        <span
          className={`px-3 py-1 ${config.badge} text-xs font-bold rounded-full`}
        >
          {config.label}
        </span>
      </div>

      <h3 className="text-xl font-bold font-display text-gray-900 dark:text-white mb-1 group-hover:text-aws-orange transition-colors">
        {name}
      </h3>
      {description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {description}
        </p>
      )}

      <div className="space-y-3 mb-4">
        {awsAccountId ? (
          <div className="flex items-center gap-2 text-sm">
            <Cloud className="w-4 h-4 text-aws-orange" />
            <span className="text-gray-700 dark:text-gray-300 font-medium">
              AWS: {awsAccountId}
            </span>
          </div>
        ) : (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              No AWS account connected
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm">
          <Users className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600 dark:text-gray-400">
            {memberCount} {memberCount === 1 ? "member" : "members"}
          </span>
        </div>
      </div>

      {awsAccountId && monthlyCost ? (
        <div className="pt-4 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Monthly Cost
            </p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {monthlyCost}
            </p>
          </div>
          <span className="px-4 py-2 bg-aws-orange text-white text-sm font-semibold rounded-lg group-hover:bg-aws-orange-dark transition-all">
            Open →
          </span>
        </div>
      ) : (
        <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
          <span className="block text-center px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white text-sm font-semibold rounded-lg group-hover:bg-gray-200 dark:group-hover:bg-slate-600 transition-all">
            Setup AWS →
          </span>
        </div>
      )}
    </div>
  );
};

export default TeamCard;
