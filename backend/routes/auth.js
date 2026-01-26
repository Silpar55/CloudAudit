import { Router } from "express";
import bcrypt from "bcryptjs";
import {
  validEmail,
  validPhone,
  validCountryCode,
  validPassword,
  validText,
} from "../utils/validation.js";
import { createUser } from "../models/user.model.js";
const router = Router();

router.post("/signup", async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, phone, countryCode } =
      req.body;

    if (!validText(firstName))
      return res.status(400).send({ message: "First name is invalid" });

    if (!validText(lastName))
      return res.status(400).send({ message: "Last name is invalid" });

    if (!validEmail(email))
      return res.status(400).send({ message: "Email is invalid" });

    if (!validPhone(phone))
      return res.status(400).send({ message: "Phone is invalid" });

    if (!validCountryCode(countryCode))
      return res.status(400).send({ message: "Country code is invalid" });

    const passwordResults = validPassword(password);
    if (passwordResults.length > 0)
      return res.status(400).send({
        message: `Password is invalid check the following ${passwordResults[0].message}`,
      });

    const hashPassword = bcrypt.hashSync(password, 10);

    const user = {
      firstName,
      lastName,
      email,
      password: hashPassword,
      phone,
      countryCode,
    };

    const result = await createUser(user);

    if (!result)
      return res.status(422).send({ message: "Unable to create a username" });

    return res.status(200).send({ result });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      message: error,
    });
  }
});

router.post("/login", (req, res, next) => {});

export default router;
