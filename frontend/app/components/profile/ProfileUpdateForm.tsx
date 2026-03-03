import { useState, useEffect } from "react";
import { useUpdateProfile } from "~/hooks/useProfile";
import { Card, Input, Button, Spinner, Alert } from "~/components/ui";
import {
  parsePhoneNumber,
  getCountryCallingCode,
  type Country,
} from "react-phone-number-input";

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

  // State intended for API submission (matches database structure)
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    country_code: "",
  });

  // State strictly for the UI input to render the flag properly (E.164 format)
  const [phoneInputValue, setPhoneInputValue] = useState("");

  useEffect(() => {
    if (initialData) {
      let e164Phone = "";
      const phone = initialData.phone || "";
      const countryCode = initialData.country_code as Country;

      // Construct proper E.164 format (+14375994791) so the flag displays correctly
      if (countryCode && phone) {
        try {
          const callingCode = getCountryCallingCode(countryCode);
          // Only prepend if the phone doesn't already have a plus
          e164Phone = phone.startsWith("+") ? phone : `+${callingCode}${phone}`;
        } catch (error) {
          e164Phone = phone.startsWith("+") ? phone : `+${phone}`;
        }
      } else if (phone) {
        e164Phone = phone.startsWith("+") ? phone : `+${phone}`;
      }

      setPhoneInputValue(e164Phone);
      setFormData({
        first_name: initialData.first_name || "",
        last_name: initialData.last_name || "",
        phone: phone,
        country_code: countryCode || "",
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhoneChange = (value: string) => {
    setPhoneInputValue(value); // Update UI string

    // Parse the E.164 string back into database-friendly formats
    if (value) {
      const parsed = parsePhoneNumber(value);
      if (parsed) {
        setFormData((prev) => ({
          ...prev,
          phone: parsed.nationalNumber, // e.g., "4375994791"
          country_code: parsed.country || prev.country_code, // e.g., "CA"
        }));
      }
    } else {
      // Clear data if input is completely erased
      setFormData((prev) => ({ ...prev, phone: "", country_code: "" }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-3">
      {/* Left Column: Context */}
      <div className="px-4 sm:px-0 md:col-span-1">
        <h2 className="text-base font-semibold leading-7 text-gray-900 dark:text-white">
          Personal Information
        </h2>
        <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
          Update your name and contact details. This information will be
          displayed on your profile and used for team communications.
        </p>
      </div>

      {/* Right Column: Interactive Card */}
      <div className="md:col-span-2 space-y-4">
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

        <Card className="p-0 shadow-sm border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 overflow-hidden sm:rounded-xl">
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Input
                  id="first_name"
                  name="first_name"
                  label="First Name"
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="First Name"
                  disabled={updateMutation.isPending}
                  className="w-full"
                />

                <Input
                  id="last_name"
                  name="last_name"
                  label="Last Name"
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="Last Name"
                  disabled={updateMutation.isPending}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-1 gap-6">
                <Input
                  id="phone"
                  name="phone"
                  type="phone"
                  label="Phone Number"
                  value={phoneInputValue} // Use the E.164 state for the UI
                  onChange={handlePhoneChange}
                  placeholder="Enter phone number"
                  disabled={updateMutation.isPending}
                  className="w-full sm:max-w-md"
                />
              </div>
            </div>

            {/* Form Footer / Action Area */}
            <div className="px-6 py-4 flex justify-end">
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="w-full sm:w-auto min-w-30"
              >
                {updateMutation.isPending ? <Spinner /> : null}
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ProfileUpdateForm;
