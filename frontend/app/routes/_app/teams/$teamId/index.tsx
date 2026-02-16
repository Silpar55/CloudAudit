import React, { useState } from "react";
import { Sidebar, Header } from "~/components/layout";
import {
  MetricCard,
  AnomalyCard,
  RecommendationCard,
} from "~/components/dashboard";
import { DollarSign, AlertTriangle, TrendingDown, Server } from "lucide-react";

export default function TeamWorkspace() {
  const [activeRoute, setActiveRoute] = useState("/");

  return (
    <div className="flex-1 overflow-y-auto p-8">
      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          variant="gradient"
          title="Monthly Cost"
          value="$3,847"
          icon={<DollarSign className="w-6 h-6" />}
          trend="+8%"
        />

        <MetricCard
          title="Anomalies"
          value="2"
          icon={<AlertTriangle className="w-6 h-6 text-red-600" />}
          trendType="negative"
        />

        <MetricCard
          title="Potential Savings"
          value="$892"
          subtitle="8 recommendations"
          icon={<TrendingDown className="w-6 h-6 text-green-600" />}
          trendType="positive"
        />

        <MetricCard
          title="Resources"
          value="47"
          subtitle="12 EC2 • 3 RDS • 32 S3"
          icon={<Server className="w-6 h-6 text-blue-600" />}
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Anomalies */}
        <div>
          <h2 className="text-xl font-bold font-display text-gray-900 dark:text-white mb-4">
            Active Anomalies
          </h2>
          <div className="space-y-4">
            <AnomalyCard
              title="EC2 Cost Spike"
              resource="us-east-1 • t3.large"
              service="ec2"
              severity="critical"
              description="Instance i-0abc123 exceeded baseline by +142%"
              expectedCost="$45.20"
              actualCost="$109.40"
              deviation="+142%"
              onClick={() => console.log("View details")}
            />
          </div>
        </div>

        {/* Recommendations */}
        <div>
          <h2 className="text-xl font-bold font-display text-gray-900 dark:text-white mb-4">
            AI Recommendations
          </h2>
          <div className="space-y-4">
            <RecommendationCard
              title="Downsize EC2 Instances"
              description="4 instances using <20% CPU. Downsize from t3.large to t3.medium."
              service="ec2"
              savings="$340/month"
              confidence={95}
              variant="default"
              onApply={() => console.log("Apply")}
              onLearnMore={() => console.log("Learn more")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
