import React, { useState } from "react";
import { useChangePassword } from "~/hooks/useProfile";
import { Card, Input, Button, Spinner, Alert } from "~/components/ui";
import { validPassword } from "~/utils/validation";

const PasswordSettings = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [errors, setErrors] = useState<any>({});

  const mutation = useChangePassword();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const passErrors = validPassword(newPassword);
    if (passErrors.length > 0) {
      setErrors({ newPassword: passErrors[0].message });
      return;
    }
    if (currentPassword === newPassword) {
      setErrors({
        newPassword: "New password must be different from current.",
      });
      return;
    }

    mutation.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setCurrentPassword("");
          setNewPassword("");
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Change Password</h2>
        <p className="text-sm text-gray-500 mt-1">
          Update your password to keep your account secure.
        </p>
      </div>

      {mutation.isSuccess && (
        <Alert
          variant="success"
          title="Success"
          message="Password updated successfully."
        />
      )}
      {mutation.isError && (
        <Alert
          variant="danger"
          title="Update Failed"
          message={
            (mutation.error as any)?.response?.data?.message ||
            "Failed to update password."
          }
        />
      )}

      <Card className="p-6 shadow-sm border border-gray-100">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e: any) => setCurrentPassword(e.target.value)}
              className="w-full md:w-2/3"
              required
              disabled={mutation.isPending}
            />
          </div>
          <div className="space-y-2">
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e: any) => setNewPassword(e.target.value)}
              error={!!errors.newPassword}
              errorMessage={errors.newPassword}
              className="w-full md:w-2/3"
              required
              disabled={mutation.isPending}
            />
          </div>
          <div className="pt-2">
            <Button
              type="submit"
              disabled={mutation.isPending || !currentPassword || !newPassword}
            >
              {mutation.isPending ? <Spinner /> : null}
              {mutation.isPending ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default PasswordSettings;
