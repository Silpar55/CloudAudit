import React, { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Sparkles } from "lucide-react";
import { Card, Spinner, Button } from "~/components/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { TeamNotificationRow } from "~/services/notificationService";
import { notificationService } from "~/services/notificationService";

type Props = {
  teamId: string;
  teamNotifications?: TeamNotificationRow[];
  isLoading: boolean;
};

const formatNotificationMessage = (row: TeamNotificationRow): string => {
  const actor =
    [row.first_name, row.last_name].filter(Boolean).join(" ") ||
    row.email ||
    "User";

  const rawDetails: any = row.details ?? {};
  const details =
    typeof rawDetails === "string"
      ? (() => {
          try {
            return JSON.parse(rawDetails);
          } catch {
            return {};
          }
        })()
      : rawDetails;

  const anomaliesDetected = Number(details?.anomaliesDetected ?? 0);
  const recommendationsGenerated = Number(details?.recommendationsGenerated ?? 0);

  return `${actor} ran analysis, ${anomaliesDetected} anomalies and ${recommendationsGenerated} recommendations.`;
};

const NotificationsMenu = ({
  teamId,
  teamNotifications,
  isLoading,
}: Props) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const notifications = teamNotifications ?? [];
  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (n) => !n.is_dismissed && !n.is_read,
      ).length,
    [notifications],
  );

  const queryClient = useQueryClient();

  const markReadMutation = useMutation({
    mutationFn: (notificationId: string) =>
      notificationService.markNotificationRead(teamId, notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamNotifications", teamId] });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: (notificationId: string) =>
      notificationService.dismissNotification(teamId, notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamNotifications", teamId] });
    },
  });

  useEffect(() => {
    if (!open) return;

    const onMouseDown = (e: MouseEvent) => {
      const el = menuRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    };

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
        aria-label="Team notifications"
      >
        <Bell className="w-5 h-5 text-gray-700 dark:text-gray-200" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-aws-orange text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-md max-w-[86vw] z-50">
          <Card padding="sm" className="border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-aws-orange" />
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  Notifications
                </p>
              </div>
              <button
                type="button"
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>

            {isLoading ? (
              <div className="py-6 flex justify-center">
                <Spinner size={36} />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  No recent notifications
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  ML analysis results will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-112 overflow-y-auto pr-1">
                {notifications.map((row) => (
                  <div
                    key={row.audit_log_id}
                    className={`rounded-xl border border-gray-200 dark:border-slate-700 p-3 bg-gray-50/60 dark:bg-slate-900/30 ${
                      row.is_read ? "opacity-80" : ""
                    }`}
                  >
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(row.created_at).toLocaleString("en-CA", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                      {formatNotificationMessage(row)}
                    </p>

                    <div className="flex items-center gap-2 mt-3">
                      {!row.is_read && !row.is_dismissed && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            markReadMutation.mutate(row.audit_log_id)
                          }
                        >
                          Mark read
                        </Button>
                      )}
                      {!row.is_dismissed && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() =>
                            dismissMutation.mutate(row.audit_log_id)
                          }
                        >
                          Dismiss
                        </Button>
                      )}
                      {row.is_dismissed && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Dismissed
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default NotificationsMenu;

