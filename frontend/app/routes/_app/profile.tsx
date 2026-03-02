import { useProfile } from "~/hooks/useProfile";
import { Alert, SectionLoader } from "~/components/ui";
import {
  EmailSettings,
  ProfileUpdateForm,
  PasswordSettings,
  DeleteAccount,
} from "~/components/profile"; // Update imports

export default function ProfilePage() {
  const { data: profile, isLoading, isError } = useProfile();

  if (isLoading) return <SectionLoader />;
  if (isError)
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <Alert
          variant="danger"
          title="Error"
          message="Could not load profile data."
        />
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-12">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-2">
          Manage your account settings and preferences.
        </p>
      </div>

      <hr className="border-gray-200" />

      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Personal Information
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Update your name and contact details.
          </p>
        </div>
        <ProfileUpdateForm initialData={profile} />
      </section>

      <section>
        <EmailSettings currentEmail={profile?.email} />
      </section>

      <section>
        <PasswordSettings />
      </section>

      <section className="pt-8 border-t border-gray-200">
        <DeleteAccount currentEmail={profile?.email} />
      </section>
    </div>
  );
}
