import React, { useState } from "react";
import { Alert, Button, Input } from "~/components/ui";
import { X } from "lucide-react";
import { useCreateTeam } from "~/hooks/useTeam";
import { useNavigate } from "react-router";

type Props = {
  onClose: () => void;
};

const CreateTeamForm = ({ onClose }: Props) => {
  const navigate = useNavigate();
  const [formData, setFormData] = React.useState({
    name: "",
    description: "",
  });

  const [alert, setAlert] = useState<any>({
    dismissible: true,
    title: "",
    message: "",
    visible: false,
    variant: "info",
  });
  const { mutateAsync } = useCreateTeam();

  const handleOnDismiss = () => {
    setAlert({
      ...alert,
      visible: false,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const data = await mutateAsync(formData);

      navigate(`/teams/${data.teamId}`);
    } catch (error: any) {
      setAlert({
        title: "Error",
        message: error.response?.data?.message || "Something went wrong",
        visible: true,
        variant: "danger",
      });
    }
  };

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  return (
    <div className="relative space-y-4">
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
      <button
        onClick={onClose}
        className="absolute top-0 right-0 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 transition"
        aria-label="Close modal"
      >
        <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
      </button>

      <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
        Create a Team
      </h2>

      <form onSubmit={handleSubmit}>
        <Input
          type="text"
          label="Name"
          placeholder="Team name"
          value={formData.name}
          name="name"
          onChange={(e: any) => handleChange("name", e.target.value)}
          required
        />

        <Input
          type="text"
          label="Description"
          placeholder="Description"
          value={formData.description}
          name="description"
          onChange={(e: any) => handleChange("description", e.target.value)}
          className="mt-5"
        />

        <div className="flex flex-row-reverse justify-between gap-3 mt-5">
          <Button>Continue</Button>
        </div>
      </form>
    </div>
  );
};

export default CreateTeamForm;
