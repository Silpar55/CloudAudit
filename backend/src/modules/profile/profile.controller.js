import * as profileService from "./profile.service.js";

export const getProfile = async (req, res, next) => {
  try {
    // req.userId is injected by your auth middleware
    const profile = await profileService.getProfile(req.userId);

    return res.status(200).send({ profile });
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    // Extracted payload matches the new schema fields
    const { first_name, last_name, phone, country_code } = req.body;

    const profile = await profileService.updateProfileDetails(req.userId, {
      first_name,
      last_name,
      phone,
      country_code,
    });

    return res
      .status(200)
      .send({ message: "Profile updated successfully", profile });
  } catch (err) {
    next(err);
  }
};
