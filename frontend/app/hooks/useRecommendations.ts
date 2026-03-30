import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  recommendationService,
} from "../services/recommendationsService";

/** Shared query key — invalidate from anomaly analysis + recommendation actions. */
export const recommendationsQueryKey = (
  teamId: string | undefined,
  accountId: string | undefined,
) => ["recommendations", teamId, accountId] as const;

export const useRecommendations = (
  teamId: string | undefined,
  accountId: string | undefined,
) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: recommendationsQueryKey(teamId, accountId),
    queryFn: () =>
      recommendationService.getRecommendations(teamId!, accountId!),
    enabled: !!teamId && !!accountId,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: recommendationsQueryKey(teamId, accountId),
    });

  const generateMutation = useMutation({
    mutationFn: () =>
      recommendationService.generateRecommendations(teamId!, accountId!),
    onSuccess: invalidate,
  });

  const implementMutation = useMutation({
    mutationFn: (id: string) =>
      recommendationService.implementRecommendation(teamId!, accountId!, id),
    onSuccess: invalidate,
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) =>
      recommendationService.resolveRecommendation(teamId!, accountId!, id),
    onSuccess: invalidate,
  });

  const dismissMutation = useMutation({
    mutationFn: (id: string) =>
      recommendationService.dismissRecommendation(teamId!, accountId!, id),
    onSuccess: invalidate,
  });

  const axiosMessage = (err: unknown) => {
    const e = err as { response?: { data?: { message?: string } } };
    return e?.response?.data?.message ?? "Something went wrong.";
  };

  return {
    recommendations: query.data ?? [],
    loading: query.isLoading || query.isFetching,
    error: query.isError ? axiosMessage(query.error) : null,
    refetch: query.refetch,
    generate: () => generateMutation.mutateAsync(),
    implement: (id: string) => implementMutation.mutateAsync(id),
    resolve: (id: string) => resolveMutation.mutateAsync(id),
    dismiss: (id: string) => dismissMutation.mutateAsync(id),
    isMutating:
      generateMutation.isPending ||
      implementMutation.isPending ||
      resolveMutation.isPending ||
      dismissMutation.isPending,
  };
};
