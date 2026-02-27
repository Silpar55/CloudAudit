import * as profileModel from "./profile.model.js";
import { AppError } from "#utils/helper/AppError.js";

export const getProfile = async (userId) => {
  const profile = await profileModel.getProfileById(userId);

  if (!profile) throw new AppError("User profile not found", 404);

  return profile;
};

export const updateProfileDetails = async (userId, updateData) => {
  const profile = await profileModel.updateProfile(userId, updateData);

  if (!profile) throw new AppError("Profile not found or update failed", 404);

  return profile;
};
