import React from "react";
import { Bell, X } from "lucide-react";
import { Button, Card } from "~/components/ui";
import { useWorkspaceTeamData } from "~/hooks/useWorkspaceTeamData";
import { useUpdateMyAnalysisNotifications } from "~/hooks/useTeamMember";

/**
 * First-time prompt after creating or joining a workspace: opt in or out of
 * analysis emails. Shown while analysis_prefs_prompted is false.
 */
export function AnalysisNotificationPrompt({ teamId }: { teamId: string }) {
  const { data, isLoading } = useWorkspaceTeamData(teamId);
  const updatePrefs = useUpdateMyAnalysisNotifications(teamId);

  if (isLoading || !data?.teamMember) return null;

  const tm = data.teamMember as {
    analysis_prefs_prompted?: boolean;
  };
  if (tm.analysis_prefs_prompted !== false) return null;

  const dismiss = (notify: boolean) => {
    updatePrefs.mutate({
      notify_analysis_email: notify,
      analysis_prefs_prompted: true,
    });
  };

  return (
    <>
      {/* Dismiss = reject (same as "Not now") */}
      <button
        type="button"
        className="fixed inset-0 z-40 cursor-default bg-slate-900/20 dark:bg-black/30"
        aria-label="Dismiss notification prompt"
        disabled={updatePrefs.isPending}
        onClick={() => dismiss(false)}
      />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-end p-4 sm:p-6">
        <Card
          padding="lg"
          className="pointer-events-auto relative max-w-md border border-aws-orange/25 bg-white shadow-2xl dark:border-aws-orange/30 dark:bg-slate-800"
          role="dialog"
          aria-modal="true"
          aria-labelledby="analysis-notify-title"
          aria-describedby="analysis-notify-desc"
        >
          <button
            type="button"
            className="absolute right-3 top-3 rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-slate-700 dark:hover:text-gray-200"
            aria-label="Not now"
            disabled={updatePrefs.isPending}
            onClick={() => dismiss(false)}
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex gap-3 pr-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-aws-orange/10 text-aws-orange">
              <Bell className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h2
                id="analysis-notify-title"
                className="text-sm font-semibold text-gray-900 dark:text-white"
              >
                Email notifications?
              </h2>
              <p
                id="analysis-notify-desc"
                className="mt-1 text-sm text-gray-600 dark:text-gray-300"
              >
                Get notified by email when AI analysis runs and there are
                updates for this workspace (anomalies, recommendations).
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  type="button"
                  size="sm"
                  disabled={updatePrefs.isPending}
                  onClick={() => dismiss(true)}
                >
                  Notify me
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={updatePrefs.isPending}
                  onClick={() => dismiss(false)}
                >
                  Not now
                </Button>
              </div>
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                You can change this anytime in workspace settings.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
