import { useProfile } from "~/hooks/useProfile";
import { Alert, SectionLoader } from "~/components/ui";
import {
  EmailSettings,
  ProfileUpdateForm,
  PasswordSettings,
  DeleteAccount,
} from "~/components/profile";

export default function ProfilePage() {
  const { data: profile, isLoading, isError } = useProfile();

  if (isLoading) return <SectionLoader />;
  if (isError)
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <Alert
          variant="danger"
          title="Error"
          message="Could not load profile data."
        />
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Page Header */}
      <div className="mb-10 border-b border-gray-200 dark:border-gray-800 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Account Settings
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Manage your account settings, secure your profile, and control your
          preferences.
        </p>
      </div>

      {/* Settings Sections - Divided by horizontal lines */}
      <div className="space-y-12 divide-y divide-gray-200 dark:divide-gray-800">
        <div className="pt-2">
          <ProfileUpdateForm initialData={profile} />
        </div>

        <div className="pt-12">
          <EmailSettings currentEmail={profile?.email} />
        </div>

        <div className="pt-12">
          <PasswordSettings />
        </div>

        <div className="pt-12">
          <DeleteAccount currentEmail={profile?.email} />
        </div>
      </div>
    </div>
  );
}
