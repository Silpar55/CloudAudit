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
    <div className="space-y-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Email Address</h2>
        <p className="text-sm text-gray-500 mt-1">
          Manage the email address associated with your CloudAudit account.
        </p>
      </div>

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

      <Card className="p-6 shadow-sm border border-gray-100">
        <div className="mb-6">
          <Input
            id="current_email"
            label="Current Email"
            type="email"
            readOnly
            value={currentEmail || "Loading..."}
            className="w-full md:w-2/3"
            required
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              id="new_email"
              label="New Email Address"
              type="email"
              value={newEmail}
              onChange={(e: any) => setNewEmail(e.target.value)}
              placeholder="Enter new email address"
              disabled={requestMutation.isPending || requestMutation.isSuccess}
              className="w-full md:w-2/3"
              required
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={
                requestMutation.isPending ||
                requestMutation.isSuccess ||
                !newEmail ||
                newEmail === currentEmail
              }
            >
              {requestMutation.isPending ? <Spinner navbar={false} /> : null}
              {requestMutation.isPending ? "Sending..." : "Request Change"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default EmailSettings;
