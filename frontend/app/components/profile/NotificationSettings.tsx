/**
 * CloudAudit — Profile settings UI: `NotificationSettings.tsx`.
 */

import React, { useState, useEffect } from "react";
import { Card, Button, Alert, Spinner } from "~/components/ui";
import Toggle from "~/components/ui/Toggle";
import { useUpdateProfile } from "~/hooks/useProfile";

type Props = {
  emailNotificationsEnabled: boolean;
};

const slackCommunityUrl = import.meta.env.VITE_SLACK_COMMUNITY_URL?.trim() || "";

const NotificationSettings = ({ emailNotificationsEnabled }: Props) => {
  const [enabled, setEnabled] = useState(emailNotificationsEnabled);
  const update = useUpdateProfile();

  useEffect(() => {
    setEnabled(emailNotificationsEnabled);
  }, [emailNotificationsEnabled]);

  const dirty = enabled !== emailNotificationsEnabled;

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-3">
      <div className="px-4 sm:px-0 md:col-span-1">
        <h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
          Notifications
        </h2>
        <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
          Control optional product emails about cost analysis and anomalies when
          you run ML analysis. Account verification and team invites are
          unaffected.
        </p>
      </div>

      <div className="md:col-span-2 space-y-4">
        {update.isError && (
          <Alert
            variant="danger"
            title="Could not save"
            message={
              (update.error as any)?.response?.data?.message ||
              "Failed to update preferences."
            }
          />
        )}
        {update.isSuccess && (
          <Alert
            variant="success"
            title="Saved"
            message="Your notification preferences were updated."
          />
        )}

        <Card className="p-0 shadow-sm border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 overflow-hidden sm:rounded-xl">
          <div className="p-6 space-y-6">
            <Toggle
              label="Email me about analysis results (anomalies & summaries)"
              checked={enabled}
              onChange={(next: boolean) => setEnabled(next)}
              disabled={update.isPending}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              When disabled, we skip optional SES emails for runs you trigger
              (Slack alerts to your operator webhook may still apply).
            </p>
          </div>
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
            <Button
              type="button"
              disabled={!dirty || update.isPending}
              onClick={() =>
                update.mutate({ email_notifications_enabled: enabled })
              }
            >
              {update.isPending ? <Spinner /> : null}
              {update.isPending ? "Saving…" : "Save preferences"}
            </Button>
          </div>
        </Card>

        {slackCommunityUrl ? (
          <Card className="p-6 shadow-sm border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 sm:rounded-xl">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              Slack community
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Join the CloudAudit Slack to get help from the team and other
              users.
            </p>
            <a
              href={slackCommunityUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg bg-[#4A154B] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Join Slack
            </a>
          </Card>
        ) : null}
      </div>
    </div>
  );
};

export default NotificationSettings;
