import { useState, useEffect } from "react";
import { useUpdateProfile } from "~/hooks/useProfile";
import { Card, Input, Button, Spinner, Alert } from "~/components/ui";

// Define the shape of the expected profile data prop
interface ProfileData {
  first_name?: string;
  last_name?: string;
  phone?: string;
  country_code?: string;
}

interface ProfileUpdateFormProps {
  initialData: ProfileData;
}

const ProfileUpdateForm = ({ initialData }: ProfileUpdateFormProps) => {
  const updateMutation = useUpdateProfile();

  // Local state initialized with the fetched data
  const [formData, setFormData] = useState({
    first_name: initialData?.first_name || "",
    last_name: initialData?.last_name || "",
    phone: initialData?.phone || "",
    country_code: initialData?.country_code || "",
  });

  // Sync form data if initialData changes (e.g., after a successful refetch)
  useEffect(() => {
    if (initialData) {
      setFormData({
        first_name: initialData.first_name || "",
        last_name: initialData.last_name || "",
        phone: initialData.phone || "",
        country_code: initialData.country_code || "",
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      {/* Feedback Alerts */}
      {updateMutation.isSuccess && (
        <Alert
          variant="success"
          title="Profile Updated"
          message="Your changes have been saved successfully."
        />
      )}

      {updateMutation.isError && (
        <Alert
          variant="danger"
          title="Update Failed"
          message={
            (updateMutation.error as any)?.response?.data?.message ||
            "Something went wrong saving your data."
          }
        />
      )}

      <Card className="p-6 shadow-sm border border-gray-100">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label
                htmlFor="first_name"
                className="block text-sm font-medium text-gray-700"
              >
                First Name
              </label>
              <Input
                id="first_name"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                placeholder="First Name"
                disabled={updateMutation.isPending}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="last_name"
                className="block text-sm font-medium text-gray-700"
              >
                Last Name
              </label>
              <Input
                id="last_name"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                placeholder="Last Name"
                disabled={updateMutation.isPending}
                className="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label
                htmlFor="country_code"
                className="block text-sm font-medium text-gray-700"
              >
                Country Code
              </label>
              <Input
                id="country_code"
                name="country_code"
                value={formData.country_code}
                onChange={handleChange}
                placeholder="+1"
                disabled={updateMutation.isPending}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700"
              >
                Phone Number
              </label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="555-123-4567"
                disabled={updateMutation.isPending}
                className="w-full"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="w-full md:w-auto min-w-30"
            >
              {updateMutation.isPending ? <Spinner navbar={false} /> : null}
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ProfileUpdateForm;
