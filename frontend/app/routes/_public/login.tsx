import { Input, Button, Alert } from "~/components/ui";

import { validEmail, validPassword } from "~/utils/validation";
import React from "react";
import { useLogin } from "~/hooks/useAuth";
import { useAuth } from "~/context/AuthContext";

const validateField = (name: string, value: string) => {
  switch (name) {
    case "email":
      return validEmail(value) ? "" : "Email is invalid";

    case "password":
      const result = validPassword(value);
      return result.length > 0 ? result[0].message : "";

    default:
      return "";
  }
};

export default function Login() {
  const { mutateAsync } = useLogin();
  const { login } = useAuth();

  const [formData, setFormData] = React.useState({
    email: "",
    password: "",
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
      const data = await mutateAsync(formData);
      setAlert({
        ...alert,
        title: "Welcome back!",
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
          Sign in
        </h1>
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

        <Button className="mt-5">Sign in</Button>
      </form>
    </section>
  );
}
