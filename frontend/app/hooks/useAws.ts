import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { awsService } from "~/services/awsService";

// ─── Provision / Activate ────────────────────────────────────────────────────

export const useProvisionAwsAccount = () => {
  return useMutation({
    mutationFn: ({ teamId, roleArn }: { teamId: string; roleArn: string }) =>
      awsService.provisionAccount(teamId, roleArn),
  });
};

export const useActivateAwsAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teamId, roleArn }: { teamId: string; roleArn: string }) =>
      awsService.activateAccount(teamId, roleArn),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["workspace-team-data", variables.teamId],
        }),
        queryClient.invalidateQueries({ queryKey: ["team", variables.teamId] }),
        queryClient.invalidateQueries({ queryKey: ["userTeams"] }),
      ]);
    },
  });
};

// ─── AWS Account ─────────────────────────────────────────────────────────────

/**
 * Fetch the team's AWS account record (internal id, status, timestamps).
 * Provides the internal UUID needed for all cost explorer calls.
 */
export const useGetAwsAccount = (
  teamId: string | undefined,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: ["aws-account", teamId],
    queryFn: () => awsService.getAwsAccount(teamId!),
    enabled: options?.enabled ?? !!teamId,
    staleTime: 1000 * 60 * 5, // 5 min — account meta rarely changes
    refetchOnWindowFocus: false,
  });
};

// ─── Cost Explorer ───────────────────────────────────────────────────────────

export interface CostRow {
  cache_id: string;
  aws_account_id: string; // internal UUID
  time_period_start: string; // YYYY-MM-DD
  time_period_end: string;
  service: string;
  region: string;
  unblended_cost: number;
  unblended_unit: string;
  usage_quantity: number;
  usage_quantity_unit: string;
  retrieved_at: string;
  is_stale: boolean;
}

/**
 * PRIMARY read hook — reads from cost_explorer_cache (DB only, no AWS call).
 *
 * Used for all normal loads and date range changes. Fast and cheap.
 * Returns an empty array when no cache exists yet for the date range,
 * which tells the dashboard to prompt the user to run a sync.
 *
 * @param teamId    - Team UUID
 * @param accId     - Internal aws_accounts.id UUID
 * @param startDate - YYYY-MM-DD
 * @param endDate   - YYYY-MM-DD
 */
export const useGetCachedCostData = (
  teamId: string | undefined,
  accId: string | undefined,
  startDate: string,
  endDate: string,
  options?: { enabled?: boolean },
) => {
  return useQuery<CostRow[]>({
    queryKey: ["cost-cached", teamId, accId, startDate, endDate],
    queryFn: async () => {
      const res = await awsService.getCachedCostData(
        teamId!,
        accId!,
        startDate,
        endDate,
      );
      // Backend returns { data: CostRow[] }
      return res.data ?? [];
    },
    enabled: (options?.enabled ?? true) && !!teamId && !!accId,
    staleTime: 1000 * 60 * 10, // 10 min — cache is cheap to re-read
    refetchOnWindowFocus: false,
  });
};

/**
 * SYNC mutation — triggers a live AWS Cost Explorer API call, upserts rows
 * into cost_explorer_cache, then returns the full rows for the date window.
 *
 * Only called when the user explicitly presses "Refresh". On success it
 * writes the returned rows directly into the ["cost-cached"] query cache so
 * the dashboard re-renders instantly without a second network request.
 */
export const useSyncCostAndUsage = (
  teamId: string | undefined,
  accId: string | undefined,
  startDate: string,
  endDate: string,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      awsService.getCostAndUsage(teamId!, accId!, startDate, endDate),

    onSuccess: (responseData) => {
      // The sync endpoint returns { rowsAdded, data: CostRow[] }
      // Write the rows straight into the read cache so the UI updates immediately.
      const rows: CostRow[] = responseData?.data ?? [];

      queryClient.setQueryData(
        ["cost-cached", teamId, accId, startDate, endDate],
        rows,
      );
    },
  });
};

export const useCheckCurStatus = () => {
  return useMutation({
    mutationFn: ({ teamId, accId }: { teamId: string; accId: string }) =>
      awsService.checkCurStatus(teamId, accId),
  });
};
