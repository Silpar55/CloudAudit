/**
 * CloudAudit — React hook: `useAuditLogs`.
 * Encapsulates data fetching or UI state for consuming components.
 */

import { useQuery } from "@tanstack/react-query";
import {
  auditLogService,
  type AuditLogsQuery,
} from "../services/auditLogService";

export const useAuditLogs = (
  teamId: string | undefined,
  filters: AuditLogsQuery,
  enabled: boolean,
) => {
  return useQuery({
    queryKey: ["auditLogs", teamId, filters],
    queryFn: () => auditLogService.getAuditLogs(teamId!, filters),
    enabled: !!teamId && enabled,
  });
};
