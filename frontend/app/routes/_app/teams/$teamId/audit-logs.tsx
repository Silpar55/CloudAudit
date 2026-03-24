import React, { useMemo, useState } from "react";
import { useParams } from "react-router";
import { Button, Card, Input, SectionLoader, Alert } from "~/components/ui";
import { useWorkspaceTeamData } from "~/hooks/useWorkspaceTeamData";
import { useAuditLogs } from "~/hooks/useAuditLogs";
import { FileBarChart, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 20;

function formatDetails(details: unknown): string {
  if (details == null) return "—";
  if (typeof details === "string") return details;
  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return String(details);
  }
}

export default function AuditLogsPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const { data: workspace, isLoading: workspaceLoading } =
    useWorkspaceTeamData(teamId);

  const [page, setPage] = useState(1);
  const [draftAction, setDraftAction] = useState("");
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [applied, setApplied] = useState({
    action: "",
    dateFrom: "",
    dateTo: "",
  });

  const teamMember = workspace?.teamMember;
  const canView =
    teamMember && ["admin", "owner"].includes(teamMember.role);

  const filters = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      ...(applied.action.trim() ? { action: applied.action.trim() } : {}),
      ...(applied.dateFrom ? { dateFrom: applied.dateFrom } : {}),
      ...(applied.dateTo ? { dateTo: applied.dateTo } : {}),
    }),
    [page, applied],
  );

  const { data, isLoading, error } = useAuditLogs(teamId, filters, !!canView);

  const applyFilters = () => {
    setApplied({
      action: draftAction,
      dateFrom: draftFrom,
      dateTo: draftTo,
    });
    setPage(1);
  };

  const clearFilters = () => {
    setDraftAction("");
    setDraftFrom("");
    setDraftTo("");
    setApplied({ action: "", dateFrom: "", dateTo: "" });
    setPage(1);
  };

  if (workspaceLoading || !workspace) {
    return (
      <div className="p-8">
        <SectionLoader />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="p-8 mx-auto w-full max-w-7xl">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
          <FileBarChart className="w-6 h-6 text-indigo-500" />
          Audit Logs
        </h1>
        <Card padding="lg" className="mt-6">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Only workspace owners and admins can view audit logs.
          </p>
        </Card>
      </div>
    );
  }

  const logs = data?.logs ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  const errMsg =
    error &&
    (error as { response?: { data?: { message?: string } } }).response?.data
      ?.message;

  return (
    <div className="p-8 mx-auto w-full space-y-8 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <FileBarChart className="w-6 h-6 text-indigo-500" />
          Audit Logs
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Track important workspace actions. Filter by action text or date
          range.
        </p>
      </div>

      {error && (
        <Alert variant="danger" title="Could not load audit logs">
          {errMsg || "Request failed"}
        </Alert>
      )}

      <Card
        padding="lg"
        className="border-gray-200 dark:border-slate-700 shadow-lg"
      >
        <div className="flex flex-col lg:flex-row lg:flex-wrap gap-4 lg:items-end">
          <div className="flex-1 min-w-48">
            <Input
              type="text"
              label="Action contains"
              placeholder="e.g. TEAM_MEMBER"
              value={draftAction}
              name="action"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setDraftAction(e.target.value)
              }
            />
          </div>
          <div className="w-full sm:w-44">
            <Input
              type="date"
              label="From date"
              value={draftFrom}
              name="dateFrom"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setDraftFrom(e.target.value)
              }
            />
          </div>
          <div className="w-full sm:w-44">
            <Input
              type="date"
              label="To date"
              value={draftTo}
              name="dateTo"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setDraftTo(e.target.value)
              }
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={applyFilters}>
              Apply filters
            </Button>
            <Button type="button" variant="outline" onClick={clearFilters}>
              Clear
            </Button>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="py-12">
          <SectionLoader />
        </div>
      ) : logs.length === 0 ? (
        <Card
          padding="lg"
          className="text-center py-16 border-gray-200 dark:border-slate-700"
        >
          <p className="text-gray-600 dark:text-gray-300">
            No audit entries match your filters.
          </p>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {logs.map((row) => {
              const actor =
                [row.first_name, row.last_name].filter(Boolean).join(" ") ||
                row.email ||
                row.user_id;
              return (
                <Card
                  key={row.audit_log_id}
                  padding="md"
                  className="border-gray-200 dark:border-slate-700 shadow-md"
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                    <div>
                      <p className="font-mono text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                        {row.action}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(row.created_at).toLocaleString("en-CA", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-200">
                      <span className="text-gray-500 dark:text-gray-400">
                        By{" "}
                      </span>
                      {actor}
                    </p>
                  </div>
                  <pre className="text-xs font-mono bg-gray-50 dark:bg-slate-900/80 border border-gray-100 dark:border-slate-700 rounded-lg p-3 overflow-x-auto text-gray-800 dark:text-gray-200 whitespace-pre-wrap wrap-break-word">
                    {formatDetails(row.details)}
                  </pre>
                </Card>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {total === 0
                ? "No entries"
                : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}`}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                icon={<ChevronLeft className="w-4 h-4" />}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600 dark:text-gray-300 px-2">
                Page {page} / {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                icon={<ChevronRight className="w-4 h-4" />}
                onClick={() =>
                  setPage((p) => Math.min(totalPages, p + 1))
                }
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
