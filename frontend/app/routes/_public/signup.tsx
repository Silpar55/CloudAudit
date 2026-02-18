import { useNavigate } from "react-router";
import { Input, Button, Alert } from "~/components/ui";

import { validEmail, validName, validPassword } from "~/utils/validation";
import React from "react";
import { parsePhoneNumber } from "react-phone-number-input";
import { useSignUp } from "~/hooks/useAuth";
import { useAuth } from "~/context/AuthContext";

const validateField = (name: string, value: string) => {
  switch (name) {
    case "firstName":
      return validName(value) ? "" : "First name is invalid";

    case "lastName":
      return validName(value) ? "" : "Last name is invalid";

    case "email":
      return validEmail(value) ? "" : "Email is invalid";

    case "password":
      const result = validPassword(value);
      return result.length > 0 ? result[0].message : "";

    default:
      return "";
  }
};

export default function Signup() {
  const { mutateAsync } = useSignUp();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = React.useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    nationalNumber: "",
    countryCode: "",
  });

  const [errors, setErrors] = React.useState<any>({});
  const [alert, setAlert] = React.useState<any>({
    dismissible: true,
    title: "",
    message: "",
    visible: false,
    variant: "info",
  });

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleOnDismiss = () => {
    setAlert({
      ...alert,
      visible: false,
    });
  };

  const handleBlur = (name: string, value: string) => {
    const errorMessage = validateField(name, value);

    setErrors((prev: any) => ({
      ...prev,
      [name]: errorMessage,
    }));
  };

  const handlePhoneBlur = (value: string) => {
    const parsed = parsePhoneNumber(value);

    if (!parsed) return;

    handleChange("phone", parsed.number);
    handleChange("countryCode", parsed.country || "");
    handleChange("nationalNumber", parsed.nationalNumber || "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: any = {};

    Object.entries(formData).forEach(([key, value]) => {
      const error = validateField(key, value as string);
      if (error) newErrors[key] = error;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const data = await mutateAsync({
        ...formData,
        phone: formData.nationalNumber,
      });

      setAlert({
        title: "Welcome!",
        message: data.message,
        visible: true,
        variant: "success",
      });

      login(data.token);
    } catch (error: any) {
      setAlert({
        title: "Error",
        message: error.response?.data?.message || "Something went wrong",
        visible: true,
        variant: "danger",
      });
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-6 py-20">
      <div className="max-w-2xl mx-auto ">
        <h1 className="text-6xl font-bold font-display text-gray-900 dark:text-white mb-6">
          Get started!
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
          Join to CloudAudit and monitor and reduce the cost of your aws project
        </p>
        {alert.visible && (
          <Alert
            dismissible={alert.dismissible}
            onDismiss={handleOnDismiss}
            title={alert.title}
            variant={alert.variant}
            className="mb-5"
          >
            {alert.message}
          </Alert>
        )}
      </div>
      <form
        onSubmit={handleSubmit}
        className="mx-auto w-1/2 flex flex-col gap-3"
      >
        <Input
          label="First Name"
          placeholder="Enter your first name"
          name="firstName"
          value={formData.firstName}
          onChange={(e: any) => handleChange("firstName", e.target.value)}
          onBlur={(e: any) => handleBlur("firstName", e.target.value)}
          error={!!errors.firstName}
          errorMessage={errors.firstName}
          required
        />
        <Input
          label="Last Name"
          placeholder="Enter your last name"
          name="lastName"
          value={formData.lastName}
          onChange={(e: any) => handleChange("lastName", e.target.value)}
          onBlur={(e: any) => handleBlur("lastName", e.target.value)}
          error={!!errors.lastName}
          errorMessage={errors.lastName}
          required
        />
        <Input
          label="Email"
          placeholder="Enter your email"
          type="email"
          name="email"
          value={formData.email}
          onChange={(e: any) => handleChange("email", e.target.value)}
          onBlur={(e: any) => handleBlur("email", e.target.value)}
          error={!!errors.email}
          errorMessage={errors.email}
          required
        />
        <Input
          label="Password"
          placeholder="Enter your password"
          type="password"
          name="password"
          value={formData.password}
          onChange={(e: any) => handleChange("password", e.target.value)}
          onBlur={(e: any) => handleBlur("password", e.target.value)}
          error={!!errors.password}
          errorMessage={errors.password}
          required
        />
        <Input
          label="Phone Number"
          placeholder="Enter your phone number"
          type="phone"
          name="phone"
          value={formData.phone}
          onChange={(value: string) => handleChange("phone", value || "")}
          onBlur={() => handlePhoneBlur(formData.phone)}
          error={!!errors.phone}
          errorMessage={errors.phone}
          required
        />
        <Button className="mt-5">Get started!</Button>
      </form>
    </section>
  );
}
