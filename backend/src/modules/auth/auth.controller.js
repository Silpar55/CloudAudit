import * as authService from "./auth.service.js";
import * as jwtHelper from "#utils/helper/jwt-helper.js";

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
    const user = await authService.loginUser(req.body);
    const accessToken = jwtHelper.generateToken(user.user_id);
    const refreshToken = jwtHelper.generateRefreshToken(user.user_id);

    // Set the refresh token as a secure, HTTP-Only cookie
    res.cookie("jwt_refresh", refreshToken, {
      httpOnly: true, // Javascript cannot read this (Secure against XSS)
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    console.log(accessToken);
    return res.status(200).send({
      message: "User logged successfully",
      token: accessToken,
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
};

export const refreshAccessToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.jwt_refresh;
    if (!refreshToken)
      return res.status(401).json({ message: "No refresh token provided" });

    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, (err, decoded) => {
      if (err)
        return res
          .status(403)
          .json({ message: "Invalid or expired refresh token" });

      const newAccessToken = jwtHelper.generateToken(decoded.id);
      return res.status(200).json({ token: newAccessToken });
    });
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
    console.log(err);
    next(err);
  }
};

export const deleteAccount = async (req, res, next) => {
  try {
    const result = await authService.deleteAccount(req.userId);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return res
      .status(400)
      .json({ message: "currentPassword and newPassword are required." });

  try {
    const result = await authService.changePassword(req.userId, {
      currentPassword,
      newPassword,
    });
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const requestPasswordReset = async (req, res, next) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required." });

  try {
    const result = await authService.requestPasswordReset(email);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req, res, next) => {
  const { token, newPassword } = req.body;
  if (!token)
    return res.status(400).json({ message: "Reset token is required." });

  try {
    const result = await authService.resetPassword(token, newPassword);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
