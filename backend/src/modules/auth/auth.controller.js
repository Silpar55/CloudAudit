import * as authService from "./auth.service.js";

export const registerUser = async (req, res, next) => {
  try {
    const result = await authService.registerUser(req.body);

    if (!result)
      return res.status(422).send({ message: "Unable to create a user" });

    return res.status(201).send({ message: "User registered succesfully" });
  } catch (err) {
    next(err);
  }
};
export const loginUser = async (req, res, next) => {
  try {
    const token = await authService.loginUser(req.body);
    return res.status(200).send({ token });
  } catch (err) {
    next(err);
  }
};
