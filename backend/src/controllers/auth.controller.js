import { registerUser, loginUser } from "#services";

export async function register(req, res, next) {
  try {
    const result = await registerUser(req.body);

    if (!result)
      return res.status(422).send({ message: "Unable to create a user" });

    return res.status(201).send({ message: "User registered succesfully" });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const token = await loginUser(req.body);
    return res.status(200).send({ token });
  } catch (err) {
    next(err);
  }
}
