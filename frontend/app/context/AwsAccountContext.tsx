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
  cur_status: "pending" | "active" | "failed";
  connected_at: string | null;
  disconnected_at: string | null;
  last_tested_at: string | null;
  last_error: string | null;
  created_at: string;
};

type AwsAccountContextType = {
  account: AwsAccount | null;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  refreshAccount: () => void;
};

// ─── Context ──────────────────────────────────────────────────────────────────

const AwsAccountContext = createContext<AwsAccountContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

interface AwsAccountProviderProps {
  teamId: string;
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
