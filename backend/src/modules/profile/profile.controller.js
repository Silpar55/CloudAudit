/**
 * CloudAudit — HTTP controller: `profile`.
 * Maps Express requests to services and response shapes.
 */

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
    const { first_name, last_name, phone, country_code, email_notifications_enabled } =
      req.body;

    const profile = await profileService.updateProfileDetails(req.userId, {
      first_name,
      last_name,
      phone,
      country_code,
      email_notifications_enabled,
    });

    return res
      .status(200)
      .send({ message: "Profile updated successfully", profile });
  } catch (err) {
    next(err);
  }
};

export const requestEmailChange = async (req, res, next) => {
  try {
    const { new_email } = req.body;
    if (!new_email) {
      return res.status(400).send({ message: "New email address is required" });
    }

    await profileService.requestEmailChange(req.userId, new_email);
    return res.status(200).send({
      message: "A verification link has been sent to your new email address.",
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
};
