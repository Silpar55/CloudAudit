import { useState, useCallback, useEffect } from "react";
import {
  recommendationService,
  type Recommendation,
} from "../services/recommendationsService";

export const useRecommendations = (
  teamId: string | undefined,
  accountId: string | undefined,
) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async () => {
    if (!teamId || !accountId) return;
    try {
      setLoading(true);
      const data = await recommendationService.getRecommendations(
        teamId,
        accountId,
      );
      setRecommendations(data);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to fetch recommendations",
      );
    } finally {
      setLoading(false);
    }
  }, [teamId, accountId]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const updateStatusLocally = (
    id: string,
    newStatus: Recommendation["status"],
  ) => {
    setRecommendations((prev) =>
      prev.map((rec) =>
        rec.recommendation_id === id ? { ...rec, status: newStatus } : rec,
      ),
    );
  };

  const implement = async (id: string) => {
    if (!teamId || !accountId) return;
    await recommendationService.implementRecommendation(teamId, accountId, id);
    updateStatusLocally(id, "implemented");
  };

  const dismiss = async (id: string) => {
    if (!teamId || !accountId) return;
    await recommendationService.dismissRecommendation(teamId, accountId, id);
    updateStatusLocally(id, "dismissed");
  };

  const generate = async () => {
    if (!teamId || !accountId) return;
    await recommendationService.generateRecommendations(teamId, accountId);
    await fetchRecommendations(); // Refresh the list after generation
  };

  return {
    recommendations,
    loading,
    error,
    fetchRecommendations,
    implement,
    dismiss,
    generate,
  };
};
