import * as authService from "./auth.service.js";

export const registerUser = async (req, res, next) => {
  try {
    const { user_id } = await authService.registerUser(req.body);
    return res.status(201).json({
      message: "User registered successfully",
      userId: user_id,
    });
  } catch (err) {
    next(err);
  }
};

export const loginUser = async (req, res, next) => {
  try {
    const token = await authService.loginUser(req.body);
    return res.status(200).json({ token });
  } catch (err) {
    console.log(err);
    next(err);
  }
};
