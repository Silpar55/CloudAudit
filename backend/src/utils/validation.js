import { PasswordValidator } from "password-validator-pro";
import libphonenumber from "google-libphonenumber";

const phoneUtil = libphonenumber.PhoneNumberUtil.getInstance();
var phoneRegex = /[a-zA-Z]/;

var nameRegex = /^[\p{L}\p{M}]+(?:[ -][\p{L}\p{M}]+)*$/u;

var emailRegex =
  /^[-!#$%&'*+\/0-9=?A-Z^_a-z{|}~](\.?[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;

var countryCodeRegex = /^(\+?\d{1,3}|\d{1,4})$/;

export function validName(name = "") {
  if (!name) return false;
  var valid = nameRegex.test(name);

  if (!valid) return false;

  return true;
}

export function validPassword(password = "") {
  const noSpacesRule = {
    code: "NO_SPACES",
    message: "Password must not contain spaces.",
    validate: (password) => !/\s/.test(password), // Validation logic
  };
  const validator = new PasswordValidator({
    minLength: 8, // Minimum length of the password
    maxLength: 20, // Maximum length of the password
    requireUppercase: true, // Require at least one uppercase letter
    requireLowercase: true, // Require at least one lowercase letter
    requireNumbers: true, // Require at least one number
    requireSpecialChars: true, // Require at least one special character
    combineErrors: true, // Set this to true to combine all errors into one message
  });
  validator.addCustomRule(noSpacesRule);
  const result = validator.validate(password);

  if (result.valid) {
    return [];
  } else {
    return result.errors;
  }
}

export function validPhone(phone = "", countryCode = "") {
  try {
    if (phoneRegex.test(phone)) return false;
    const number = phoneUtil.parse(phone, countryCode);
    return phoneUtil.isValidNumber(number);
  } catch {
    return false;
  }
}

export function validEmail(email = "") {
  if (!email) return false;

  if (email.length > 254) return false;

  var valid = emailRegex.test(email);
  if (!valid) return false;

  let parts = email.split("@");
  if (parts[0].length > 64) return false;

  var domainParts = parts[1].split(".");
  if (
    domainParts.some(function (part) {
      return part.length > 63;
    })
  )
    return false;

  return true;
}
