import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  validEmail,
  validPhone,
  validCountryCode,
  validPassword,
  validName,
} from "../utils/validation.js";
import { createUser, findUser } from "../models/user.model.js";
const router = Router();

router.post("/signup", async (req, res, _next) => {
  try {
    const { firstName, lastName, email, password, phone, countryCode } =
      req.body;

    if (!validName(firstName))
      return res.status(400).send({ message: "First name is invalid" });

    if (!validName(lastName))
      return res.status(400).send({ message: "Last name is invalid" });

    if (!validEmail(email))
      return res.status(400).send({ message: "Email is invalid" });

    if (!validPhone(phone, countryCode))
      // Country code should be ISO-2
      return res.status(400).send({ message: "Phone number is invalid" });

    const passwordResults = validPassword(password);
    if (passwordResults.length > 0)
      return res.status(400).send({
        message: `Password is invalid check the following ${passwordResults[0].message}`,
      });

    const hashPassword = await bcrypt.hash(password, 10);

    const user = {
      firstName,
      lastName,
      email: email.toLowerCase(),
      password: hashPassword,
      phone,
      countryCode,
    };

    const result = await createUser(user);

    if (!result)
      return res.status(422).send({ message: "Unable to create a username" });

    return res.status(201).send({ message: "User registered succesfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      message: error,
    });
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!validEmail(email))
      return res.status(400).send({ message: "Email is invalid" });

    const passwordResults = validPassword(password);
    if (passwordResults.length > 0)
      return res.status(400).send({
        message: `Password is invalid check the following ${passwordResults[0].message}`,
      });

    // Database validation
    const user = await findUser(email);
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res
        .status(404)
        .send({ message: "Invalid credentials, try again" });

    const token = jwt.sign({ userId: user.user_id }, process.env.SECRETKEY, {
      expiresIn: "1h",
    });

    return res.status(200).send({ token });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      message: error,
    });
  }
});

export default router;
