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

  console.log(
    confirmEmail.trim().toLowerCase() !== currentEmail?.trim().toLowerCase(),
  );
  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-red-600">Danger Zone</h2>
        <p className="text-sm text-gray-500 mt-1">
          Permanently delete your account and all associated data.
        </p>
      </div>

      <Card className="p-6 shadow-sm border border-red-100 bg-red-50/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-gray-100">Delete Account</h3>
            <p className="text-sm text-gray-600 mt-1">
              Once you delete your account, there is no going back. Please be
              certain.
            </p>
          </div>
          <Button variant="danger" onClick={() => setIsModalOpen(true)}>
            Delete Account
          </Button>
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-red-600 border-b pb-4">
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
              Please type your email address <strong>{currentEmail}</strong> to
              confirm.
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
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
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
  );
};

export default DeleteAccount;
