import { useParams } from "react-router";
import { useAwsAccount } from "~/context/AwsAccountContext";
import { useTeamNotifications } from "~/hooks/useTeamNotifications";
import NotificationsMenu from "./NotificationsMenu";

/**
 * Header Component
 *
 * Top header bar for team workspace pages.
 * Reads the real AWS account ID from AwsAccountContext — no hardcoded values.
 *
 * @param title    - Page title (derived from current route in layout.tsx)
 * @param teamName - Team name for the subtitle line
 * @param className - Additional CSS classes
 */

const Header = ({
  title = "Cost Overview",
  teamName = "",
  className = "",
  ...props
}: {
  title?: string;
  teamName?: string;
  className?: string;
  [key: string]: any;
}) => {
  const { teamId } = useParams<{ teamId: string }>();

  // Pull the real AWS account ID from context.
  // account is null while loading or when the team has no connected account yet.
  const { account, isLoading: isAccountLoading } = useAwsAccount();

  // Only fetch notifications if the workspace is accessible.
  // When a user is removed, team pages will render an "unavailable" screen,
  // and this prevents noisy 403s in the console.
  const { data, isLoading: isNotificationsLoading } =
    useTeamNotifications(teamId, { enabled: Boolean(teamId), limit: 20 });

  const awsAccountId = account?.aws_account_id;

  // Build subtitle: show account ID once loaded, skeleton while loading
  const subtitle = (() => {
    if (isAccountLoading) {
      return (
        <span className="flex items-center gap-2">
          <span className="inline-block w-32 h-3 bg-gray-200 dark:bg-slate-600 rounded animate-pulse" />
          {teamName && (
            <>
              <span className="text-gray-300 dark:text-slate-600">•</span>
              <span>Team: {teamName}</span>
            </>
          )}
        </span>
      );
    }

    if (awsAccountId) {
      return `AWS Account: ${awsAccountId}${teamName ? ` • Team: ${teamName}` : ""}`;
    }

    // Team has no connected AWS account (aws_required / suspended state)
    return teamName ? `Team: ${teamName}` : "";
  })();

  return (
    <header
      className={`bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-8 py-4 ${className}`}
      {...props}
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-gray-900 dark:text-white">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <NotificationsMenu
            teamId={teamId ?? ""}
            teamNotifications={data?.logs}
            isLoading={isNotificationsLoading}
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
