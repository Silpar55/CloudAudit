import { useNavigate } from "react-router";
import { Input, Button, Alert } from "~/components/ui";

import { validEmail, validName, validPassword } from "~/utils/validation";
import React from "react";
import { parsePhoneNumber } from "react-phone-number-input";
import { useSignUp } from "~/hooks/useAuth";

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
  const { mutateAsync, isSuccess, isPending } = useSignUp();
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

  const isFormValid =
    validName(formData.firstName) &&
    validName(formData.lastName) &&
    validEmail(formData.email) &&
    validPassword(formData.password).length === 0 &&
    formData.phone;

  const isDisabled = !isFormValid || isPending;

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

    const hasErrors = Object.values(errors).some((err) => err !== "");
    if (hasErrors) return;

    try {
      await mutateAsync({
        ...formData,
        phone: formData.nationalNumber,
      });
    } catch (error: any) {
      setAlert({
        visible: true,
        title: "Signup Failed",
        message: error.response?.data?.message || "Something went wrong",
        variant: "danger",
        dismissible: true,
      });
    }
  };

  if (isSuccess) {
    return (
      <section className="max-w-2xl mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl font-bold font-display text-gray-900 dark:text-white mb-6">
          Check your inbox
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
          We've sent a verification link to{" "}
          <span className="font-semibold text-aws-orange">
            {formData.email}
          </span>
          .
        </p>
        <Button onClick={() => navigate("/login")}>Go to Login</Button>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-6 py-14">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm font-semibold uppercase tracking-wide text-aws-orange">
            Start free
          </p>
          <h1 className="mt-2 text-4xl font-bold text-gray-900 dark:text-white">
            Create your CloudAudit account
          </h1>
          <p className="mt-4 text-base text-gray-600 dark:text-gray-300">
            CloudAudit is built for teams that need clear AWS cost visibility
            and practical optimization steps without enterprise-level overhead.
          </p>

          <div className="mt-8 space-y-4">
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-slate-900">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                After sign up, you can:
              </p>
              <ul className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <li>- Connect your AWS account securely with IAM roles</li>
                <li>- View cost summaries by service and trend</li>
                <li>- Detect anomalies and discover optimization opportunities</li>
              </ul>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Already have an account?{" "}
              <a
                href="/login"
                className="font-semibold text-aws-orange hover:text-aws-orange-dark"
              >
                Sign in
              </a>
              .
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Account details
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Fill in your information to start your onboarding.
          </p>
          {alert.visible && (
            <Alert
              dismissible={alert.dismissible}
              onDismiss={handleOnDismiss}
              title={alert.title}
              variant={alert.variant}
              className="mb-5 mt-5"
            >
              {alert.message}
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
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
            <Button className="mt-5" type="submit" disabled={isDisabled}>
              {isPending ? "Creating account..." : "Create my account"}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
