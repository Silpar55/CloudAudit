import * as authService from "./auth.service.js";

export const registerUser = async (req, res, next) => {
  try {
    const { result, message } = await authService.registerUser(req.body);

    return res.status(201).json({
      message: message,
      userId: result.user_id,
    });
  } catch (err) {
    next(err);
  }
};

export const loginUser = async (req, res, next) => {
  try {
    const token = await authService.loginUser(req.body);
    return res.status(200).json({ message: "User logged successfully", token });
  } catch (err) {
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

export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token)
      return res
        .status(400)
        .json({ message: "Verification token is required" });

    // The service now returns the updated user AND a fresh JWT
    const { user, accessToken } = await authService.verifyEmailToken(token);

    return res.status(200).json({
      message: "Email address verified successfully.",
      user,
      token: accessToken, // Send the token so frontend can seamlessly log them in!
    });
  } catch (err) {
    next(err);
  }
};
