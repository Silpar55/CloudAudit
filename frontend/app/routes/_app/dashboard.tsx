import React from "react";
import { TeamCard } from "~/components/dashboard";
import { useNavigate } from "react-router";

export default function DashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold font-display text-gray-900 dark:text-white mb-8">
          Select a Team
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <TeamCard
            name="DevOps Team"
            description="Production infrastructure"
            initials="DT"
            avatarColor="from-purple-500 to-purple-600"
            memberCount={5}
            awsAccountId="123456789012"
            monthlyCost="$3,847"
            status="active"
            onClick={() => navigate("/teams/team-123")}
          />

          <TeamCard
            name="ML Research"
            description="Experimental workloads"
            initials="ML"
            avatarColor="from-green-500 to-green-600"
            memberCount={2}
            status="setup_needed"
            onClick={() => navigate("/teams/team-456")}
          />
        </div>
      </div>
    </div>
  );
}
