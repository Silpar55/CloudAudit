/**
 * CloudAudit — Authenticated app route: `dashboard.tsx`.
 * Requires login; lives under the main app shell (sidebar/header).
 */

import { useNavigate } from "react-router";
import { useState } from "react";
import { CreateTeamForm, TeamCard } from "~/components/dashboard";
import { Alert, Button, Card, Modal, SectionLoader } from "~/components/ui";
import { useGetTeamsByUserId } from "~/hooks/useTeam";
import { useTeamNotificationCounts } from "~/hooks/useTeamNotificationCounts";
import { UsersRound } from "lucide-react";
import {
  useAcceptInvitation,
  useDeclineInvitation,
  useMyInvitations,
  type PendingInvitation,
} from "~/hooks/useInvitations";

function formatMonthlyCost(
  cost: unknown,
  billingCurrency?: string | null,
): string {
  if (cost == null || cost === "") return "";
  const n = typeof cost === "string" ? parseFloat(cost) : Number(cost);
  if (Number.isNaN(n)) return "";
  const code =
    typeof billingCurrency === "string" && /^[A-Z]{3}$/i.test(billingCurrency)
      ? billingCurrency.toUpperCase()
      : "USD";
  try {
    // ISO 4217 codes: CAD, USD, MXN, etc.
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      currencyDisplay: "code",
    }).format(n);
  } catch {
    return `${n.toFixed(2)} ${code}`;
  }
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data, isLoading } = useGetTeamsByUserId();
  const { data: countsData } = useTeamNotificationCounts();
  const {
    data: invitations = [],
    isLoading: invitesLoading,
    error: invitesError,
  } = useMyInvitations();
  const acceptInvite = useAcceptInvitation();
  const declineInvite = useDeclineInvitation();
  const teams = data?.teams ?? [];
  const hasTeams = teams.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 dark:bg-slate-900 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Pending invitations
            </h2>
          </div>

          {invitesLoading ? (
            <Card padding="lg" className="border-gray-200 dark:border-slate-700">
              <SectionLoader />
            </Card>
          ) : invitesError ? (
            <Alert variant="danger" title="Could not load invitations">
              Please refresh and try again.
            </Alert>
          ) : invitations.length === 0 ? (
            <Card
              padding="lg"
              className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            >
              <p className="text-sm text-gray-600 dark:text-gray-300">
                No pending invitations.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {(invitations as PendingInvitation[]).map((inv) => {
                const inviter =
                  [inv.invited_by_first_name, inv.invited_by_last_name]
                    .filter(Boolean)
                    .join(" ") ||
                  inv.invited_by_email ||
                  "Someone";
                return (
                  <Card
                    key={inv.invitation_id}
                    padding="lg"
                    className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Invited by {inviter}
                    </p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                      {inv.team_name}
                    </p>
                    {inv.team_description ? (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {inv.team_description}
                      </p>
                    ) : null}
                    <div className="mt-4 flex flex-col sm:flex-row gap-2">
                      <Button
                        disabled={acceptInvite.isPending}
                        onClick={async () => {
                          const res = await acceptInvite.mutateAsync(
                            inv.invitation_id,
                          );
                          const teamId = res?.teamId || inv.team_id;
                          if (teamId) navigate(`/teams/${teamId}`);
                        }}
                      >
                        {acceptInvite.isPending ? "Joining…" : "Join"}
                      </Button>
                      <Button
                        variant="outline"
                        disabled={declineInvite.isPending}
                        onClick={() =>
                          declineInvite.mutate(inv.invitation_id)
                        }
                      >
                        Decline
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold font-display text-gray-900 dark:text-white sm:text-3xl">
                Your teams
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                Choose a workspace to view costs, anomalies, and recommendations.
              </p>
            </div>
            <Button onClick={() => setIsModalOpen(true)}>Create team</Button>
          </div>
        </div>

        {!isLoading && !hasTeams && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center dark:border-slate-600 dark:bg-slate-800">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-aws-orange dark:bg-orange-950/30">
              <UsersRound className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              No teams joined yet
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-gray-600 dark:text-gray-300">
              Create your first team to start onboarding AWS accounts and unlock
              cost visibility, anomaly monitoring, and optimization insights.
            </p>
            <Button className="mt-6" onClick={() => setIsModalOpen(true)}>
              Create your first team
            </Button>
          </div>
        )}

        {hasTeams && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {teams.map((team: any) => (
              <TeamCard
                key={team.team_id}
                name={team.name}
                description={team.description}
                memberCount={team.member_count}
                status={team.status}
                awsAccountId={team.aws_account_id}
                monthlyCost={formatMonthlyCost(
                  team.monthly_cost,
                  team.billing_currency,
                )}
                notificationCount={countsData?.counts?.[team.team_id] ?? 0}
                onClick={() => navigate(`/teams/${team.team_id}`)}
              />
            ))}
          </div>
        )}

        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
          }}
        >
          <CreateTeamForm onClose={() => setIsModalOpen(false)} />
        </Modal>
      </div>
    </div>
  );
}
