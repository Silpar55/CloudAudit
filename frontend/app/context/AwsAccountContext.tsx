// AwsAccountContext.tsx
import { createContext, useContext, useCallback } from "react";
import { useGetAwsAccount } from "~/hooks/useAws";
import { useQueryClient } from "@tanstack/react-query";

// ─── Types ────────────────────────────────────────────────────────────────────

type AwsAccount = {
  id: string; // Internal UUID — used for all cost explorer calls
  aws_account_id: string; // 12-digit AWS account ID
  team_id: string;
  status: string;
  connected_at: string | null;
  disconnected_at: string | null;
  last_tested_at: string | null;
  last_error: string | null;
  created_at: string;
};

type AwsAccountContextType = {
  /** The AWS account record for the current team. Null if not yet loaded or not connected. */
  account: AwsAccount | null;
  /** True on the initial fetch only (no data yet). */
  isLoading: boolean;
  /** True whenever a background refetch is in progress. */
  isFetching: boolean;
  /** True if the fetch failed. */
  isError: boolean;
  /**
   * Force-invalidates the ["aws-account", teamId] query so the context
   * re-fetches from the backend. Call this after activating a new account
   * or after a sync changes account state.
   */
  refreshAccount: () => void;
};

// ─── Context ──────────────────────────────────────────────────────────────────

const AwsAccountContext = createContext<AwsAccountContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

interface AwsAccountProviderProps {
  teamId: string;
  /** Only fetch when the team status is "active". Pass the team status here. */
  teamStatus: string;
  children: React.ReactNode;
}

export const AwsAccountProvider = ({
  teamId,
  teamStatus,
  children,
}: AwsAccountProviderProps) => {
  const queryClient = useQueryClient();

  const {
    data: account,
    isLoading,
    isFetching,
    isError,
  } = useGetAwsAccount(teamId, {
    // Only run the fetch when the team is active — no point hitting the
    // endpoint during aws_required or suspended states.
    enabled: teamStatus === "active",
  });

  const refreshAccount = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["aws-account", teamId] });
  }, [queryClient, teamId]);

  return (
    <AwsAccountContext.Provider
      value={{
        account: account ?? null,
        isLoading,
        isFetching,
        isError,
        refreshAccount,
      }}
    >
      {children}
    </AwsAccountContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useAwsAccount = () => {
  const context = useContext(AwsAccountContext);
  if (!context) {
    throw new Error("useAwsAccount must be used within an AwsAccountProvider");
  }
  return context;
};
