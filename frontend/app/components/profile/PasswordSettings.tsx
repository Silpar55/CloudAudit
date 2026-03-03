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
    <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-3">
      {/* Left Column: Context */}
      <div className="px-4 sm:px-0 md:col-span-1">
        <h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
          Change Password
        </h2>
        <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
          Update your password to keep your account secure. We recommend using a
          strong password that you're not using elsewhere.
        </p>
      </div>

      {/* Right Column: Interactive Card */}
      <div className="md:col-span-2 space-y-4">
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

        <Card className="p-0 shadow-sm border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 overflow-hidden sm:rounded-xl">
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <Input
                  label="Current Password"
                  type="password"
                  value={currentPassword}
                  onChange={(e: any) => setCurrentPassword(e.target.value)}
                  className="w-full sm:max-w-md"
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
                  className="w-full sm:max-w-md"
                  required
                  disabled={mutation.isPending}
                />
              </div>
            </div>

            {/* Form Footer / Action Area */}
            <div className="px-6 py-4 flex justify-end">
              <Button
                type="submit"
                disabled={
                  mutation.isPending || !currentPassword || !newPassword
                }
              >
                {mutation.isPending ? <Spinner /> : null}
                {mutation.isPending ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default PasswordSettings;
