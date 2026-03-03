import { useState } from "react";
import { useRequestEmailChange } from "~/hooks/useProfile";
import { Card, Input, Button, Spinner, Alert } from "~/components/ui";

interface EmailSettingsProps {
  currentEmail?: string;
}

const EmailSettings = ({ currentEmail }: EmailSettingsProps) => {
  const [newEmail, setNewEmail] = useState("");
  const requestMutation = useRequestEmailChange();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || newEmail === currentEmail) return;
    requestMutation.mutate(newEmail);
  };

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-3">
      {/* Left Column: Context */}
      <div className="px-4 sm:px-0 md:col-span-1">
        <h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
          Email Address
        </h2>
        <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
          Manage the email address associated with your CloudAudit account. You
          will need to verify the new email address before it becomes active.
        </p>
      </div>

      {/* Right Column: Interactive Card */}
      <div className="md:col-span-2 space-y-4">
        {requestMutation.isSuccess && (
          <Alert
            variant="success"
            title="Verification Email Sent"
            message="Please check your new inbox. We sent a verification link that will expire in 1 hour."
          />
        )}

        {requestMutation.isError && (
          <Alert
            variant="danger"
            title="Request Failed"
            message={
              (requestMutation.error as any)?.response?.data?.message ||
              "Failed to initiate email change."
            }
          />
        )}

        <Card className="p-0 shadow-sm border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 overflow-hidden sm:rounded-xl">
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <Input
                  id="current_email"
                  label="Current Email"
                  type="email"
                  readOnly
                  value={currentEmail || "Loading..."}
                  required
                />
              </div>

              <div className="space-y-2 border-t border-gray-100 dark:border-gray-800 pt-6">
                <Input
                  id="new_email"
                  label="New Email Address"
                  type="email"
                  value={newEmail}
                  onChange={(e: any) => setNewEmail(e.target.value)}
                  placeholder="Enter new email address"
                  disabled={
                    requestMutation.isPending || requestMutation.isSuccess
                  }
                  className="w-full sm:max-w-md"
                  required
                />
              </div>
            </div>

            {/* Form Footer / Action Area */}
            <div className="px-6 py-4  flex justify-end">
              <Button
                type="submit"
                disabled={
                  requestMutation.isPending ||
                  requestMutation.isSuccess ||
                  !newEmail ||
                  newEmail === currentEmail
                }
              >
                {requestMutation.isPending ? <Spinner /> : null}
                {requestMutation.isPending ? "Sending..." : "Request Change"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default EmailSettings;
