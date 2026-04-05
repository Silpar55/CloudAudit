/**
 * CloudAudit — Authenticated app route: `index.tsx`.
 * Requires login; lives under the main app shell (sidebar/header).
 */

import { useParams } from "react-router";
import { SectionLoader } from "~/components/ui";
import { AwsSetupForm } from "~/components/teams";
import { CostDashboard } from "~/components/dashboard";
import { useGetTeamById } from "~/hooks/useTeam";
import { useAwsAccount } from "~/context/AwsAccountContext";

export default function TeamWorkspace() {
  const { teamId } = useParams<{ teamId: string }>();

  // ── Team data ──────────────────────────────────────────────────────────────
  const { data: team, isLoading: isTeamLoading } = useGetTeamById(teamId, {
    enabled: !!teamId,
  });

  const { account: awsAccount, isLoading: isAwsLoading } = useAwsAccount();

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isTeamLoading) {
    return <SectionLoader />;
  }

  // ── AWS Required ───────────────────────────────────────────────────────────
  if (team.status === "aws_required") {
    return (
      <div className="p-8 mx-auto w-full">
        <AwsSetupForm teamId={teamId!} />
      </div>
    );
  }

  // ── Suspended ─────────────────────────────────────────────────────────────
  if (team.status === "suspended") {
    return (
      <div className="p-8 mx-auto w-full">
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
            <span className="text-2xl">⛔</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Team Suspended
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
            This team has been suspended. Please contact support if you believe
            this is a mistake.
          </p>
        </div>
      </div>
    );
  }

  // ── Active ─────────────────────────────────────────────────────────────────
  if (team.status === "active") {
    // Show loader while resolving AWS account
    if (isAwsLoading) {
      return <SectionLoader />;
    }

    // Account not found — graceful fallback
    if (!awsAccount?.id) {
      return (
        <div className="p-8 mx-auto w-full">
          <p className="text-sm text-red-500">
            Could not load AWS account details. Please refresh the page.
          </p>
        </div>
      );
    }

    // Pass the responsibility completely to the Dashboard!
    return (
      <div className="p-8 mx-auto w-full">
        <CostDashboard />
      </div>
    );
  }

  return null;
}
