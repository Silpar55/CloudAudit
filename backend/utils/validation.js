import { PasswordValidator } from "password-validator-pro";

var emailRegex =
  /^[-!#$%&'*+\/0-9=?A-Z^_a-z{|}~](\.?[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;

var phoneRegex =
  /^[\+]?[0-9]{0,3}\W?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im;

var countryCodeRegex = /^(\+?\d{1,3}|\d{1,4})$/;

export function validText(input) {
  if (!input) return false;

  return true;
}

export function validPassword(password) {
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

export function validPhone(phone) {
  if (!phone) return false;

  if (phone.length > 10) return false;

  var valid = phoneRegex.test(phone);
  if (!valid) return false;

  return true;
}

export function validCountryCode(countryCode) {
  if (!countryCode) return false;

  if (countryCode.length > 5) return false;

  var valid = countryCodeRegex.test(countryCode);
  if (!valid) return false;

  return true;
}

export function validEmail(email) {
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
