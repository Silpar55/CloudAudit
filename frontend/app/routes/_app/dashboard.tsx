import { CreateTeamForm, TeamCard } from "~/components/dashboard";
import { useNavigate } from "react-router";
import { Button, Modal } from "~/components/ui";
import { useEffect, useState } from "react";
import { useGetTeamsByUserId } from "~/hooks/useTeam";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data } = useGetTeamsByUserId();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex  justify-between max-w-6xl">
          <h1 className="text-3xl font-bold font-display text-gray-900 dark:text-white mb-8">
            Select a Team
          </h1>
          <Button onClick={() => setIsModalOpen(true)} className="h-1/2">
            Create team
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <TeamCard
            name="DevOps Team"
            description="Production infrastructure"
            memberCount={5}
            awsAccountId="123456789012"
            monthlyCost="$3,847"
            status="active"
            onClick={() => navigate("/teams/team-123")}
          />

          {data &&
            data.teams.map((team: any) => (
              <TeamCard
                key={team.team_id}
                name={team.name}
                description={team.description}
                memberCount={team.member_count}
                status={team.status}
                awsAccountId={team.aws_account_id}
                monthlyCost={team.monthly_cost}
                onClick={() => navigate(`/teams/${team.team_id}`)}
              />
            ))}
        </div>

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
