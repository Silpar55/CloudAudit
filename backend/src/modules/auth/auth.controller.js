import * as authService from "./auth.service.js";

export const registerUser = async (req, res, next) => {
  try {
    const { user_id, token } = await authService.registerUser(req.body);
    return res.status(201).json({
      message: "User registered successfully",
      userId: user_id,
      token,
    });
  } catch (err) {
    next(err);
  }
};

export const loginUser = async (req, res, next) => {
  try {
    const token = await authService.loginUser(req.body);
    return res.status(200).json({ message: "User loged successfully", token });
  } catch (err) {
    console.log(err);
    next(err);
  }
};

export const getUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer "))
      return res.status(401).json({
        message: "Missing or invalid Authorization header",
        token: "invalid",
      });

    const token = authHeader.split(" ")[1];
    const user = await authService.getUser(token);

    return res.status(200).json({ message: "User retrieved", user });
  } catch (err) {
    console.log(err);
    next(err);
  }
};
