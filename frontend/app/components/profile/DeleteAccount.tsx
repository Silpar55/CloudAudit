/**
 * CloudAudit — Profile settings UI: `DeleteAccount.tsx`.
 */

import React, { useState } from "react";
import { useDeleteAccount } from "~/hooks/useProfile";
import { useAuth } from "~/context/AuthContext";
import { Card, Input, Button, Modal, Alert } from "~/components/ui";
import { AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router";

interface DeleteAccountProps {
  currentEmail?: string;
}

const DeleteAccount = ({ currentEmail }: DeleteAccountProps) => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const mutation = useDeleteAccount();
  const { logout } = useAuth();

  const handleDelete = () => {
    mutation.mutate(undefined, {
      onSuccess: () => {
        setIsModalOpen(false);
        logout(); // Logs out and redirects to login automatically
        setTimeout(() => {
          navigate("/");
        }, 10);
      },
    });
  };

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-3">
      {/* Left Column: Context */}
      <div className="px-4 sm:px-0 md:col-span-1">
        <h2 className="text-base font-semibold leading-7 text-red-600 dark:text-red-500">
          Danger Zone
        </h2>
        <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
          Permanently delete your account and all associated data. This action
          cannot be reversed.
        </p>
      </div>

      {/* Right Column: Interactive Card */}
      <div className="md:col-span-2 space-y-4">
        <Card className="p-6 shadow-sm border-2 border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-900/10 sm:rounded-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Delete Account
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Once you delete your account, there is no going back. Please be
                certain.
              </p>
            </div>
            <Button
              variant="danger"
              onClick={() => setIsModalOpen(true)}
              className="whitespace-nowrap"
            >
              Delete Account
            </Button>
          </div>
        </Card>

        {/* Confirmation Modal */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-500 border-b border-gray-200 dark:border-gray-800 pb-4">
              <AlertTriangle className="w-6 h-6" />
              <h2 className="text-xl font-bold">Delete Account</h2>
            </div>

            <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
              <p>
                This action is <strong>permanent</strong> and cannot be undone.
                This will permanently delete your account, deactivate team
                memberships, and remove your data from our servers.
              </p>
              <p>
                Please type your email address <strong>{currentEmail}</strong>{" "}
                to confirm.
              </p>

              {mutation.isError && (
                <Alert variant="danger" title="Error">
                  {(mutation.error as any)?.response?.data?.message ||
                    "Failed to delete account."}
                </Alert>
              )}

              <Input
                placeholder="Enter your email"
                value={confirmEmail}
                onChange={(e: any) => setConfirmEmail(e.target.value)}
                disabled={mutation.isPending}
                className="w-full"
              />
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-800">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsModalOpen(false);
                  setConfirmEmail("");
                }}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={
                  confirmEmail.trim().toLowerCase() !==
                    currentEmail?.trim().toLowerCase() || mutation.isPending
                }
              >
                {mutation.isPending
                  ? "Deleting..."
                  : "I understand, delete my account"}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default DeleteAccount;
