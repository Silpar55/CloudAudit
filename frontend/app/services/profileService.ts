import axiosClient from "~/api/axiosClient";

export interface ProfilePayload {
  first_name: string;
  last_name: string;
  phone: string;
  country_code: string;
}

export const profileService = {
  getProfile: async () => {
    const response = await axiosClient.get("/profile");
    return response.data.profile;
  },

  updateProfile: async (data: Partial<ProfilePayload>) => {
    const response = await axiosClient.patch("/profile", data);
    return response.data;
  },

  // NEW: Request an email change (triggers SES)
  requestEmailChange: async (new_email: string) => {
    const response = await axiosClient.post("/profile/email/request-change", {
      new_email,
    });
    return response.data;
  },

  // NEW: Verify the token from the email link
  verifyEmailChange: async (token: string) => {
    const response = await axiosClient.post("/profile/email/verify", { token });
    return response.data;
  },
};
