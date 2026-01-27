import {
  validEmail,
  validName,
  validPassword,
  validPhone,
} from "../../../src/utils/validation";

describe("validName()", () => {
  test("Empty name", () => {
    expect(validName("")).toBe(false);
  });
  test("Invalid name with numbers", () => {
    const invalidName = "Hell0";
    expect(validName(invalidName)).toBe(false);
  });

  test("Normal name", () => {
    const firstName = "John";
    expect(validName(firstName)).toBe(true);
  });

  test("Names with accents and some specials characters", () => {
    const validNames = [
      "Nyankómàgó",
      "Mǎnu",
      "Meńsã",
      "Nsĩã",
      "Dúkũ",
      "Ɔkwán",
      "Nyamékyε",
      "Obím̀pέ",
      "Bashar al-Assad",
      "Horáčková",
      "Marie-George Buffet",
      "Jürgen",
    ];

    validNames.forEach((name) => {
      // if (!validName(name)) console.log(name);
      expect(validName(name)).toBe(true);
    });
  });
});

describe("validPassword()", () => {
  test("Empty password", () => {
    // If there is something in the array, it means there are errors
    expect(validPassword("").length > 0).toBe(true);
  });

  test("Invalid passwords", () => {
    const shortPassword = "Pass1!"; // Min 8
    const longPassword = "Passw0rdPassw0rdPassw0rd!"; // Max 20
    const noUpperCase = "passw0rd!";
    const noLowerCase = "PASSW0RD!";
    const noNumbers = "Password!";
    const noEspecialChars = "Passw0rd";

    // Call the function, get the errors and check if includes the correct error code
    const shortMessage = validPassword(shortPassword)[0].code;
    const longMessage = validPassword(longPassword)[0].code;
    const noUpperCaseMessage = validPassword(noUpperCase)[0].code;
    const noLowerCaseMessage = validPassword(noLowerCase)[0].code;
    const noNumbersMessage = validPassword(noNumbers)[0].code;
    const noEspecialCharMessage = validPassword(noEspecialChars)[0].code;

    expect(shortMessage.includes("PASSWORD_TOO_SHORT")).toBe(true);
    expect(longMessage.includes("PASSWORD_TOO_LONG")).toBe(true);
    expect(noUpperCaseMessage.includes("NO_UPPERCASE")).toBe(true);
    expect(noLowerCaseMessage.includes("NO_LOWERCASE")).toBe(true);
    expect(noNumbersMessage.includes("NO_NUMBERS")).toBe(true);
    expect(noEspecialCharMessage.includes("NO_SPECIAL_CHARS")).toBe(true);
  });

  test("Valid passwords", () => {
    const validPasswords = ["Passw0rd!", "11_Secret_Key!", "$Cl0udAudit"];

    validPasswords.forEach((pass) => {
      // if (validPassword(pass).length > 0 === true) console.log(pass);
      expect(validPassword(pass).length > 0).toBe(false);
    });
  });
});

describe("validPhone()", () => {
  test("Empty phone", () => {
    expect(validPhone("")).toBe(false);
  });

  test("Invalid phones", () => {
    const invalidPhones = ["1322", "437-456-abc", "111-111-11111"];
    const validCountryCodes = ["US", "FR", "MX"];

    for (let i = 0; i < invalidPhones.length; i++) {
      // if (validPhone(invalidPhones[i], validCountryCodes[i]))
      //   console.log(invalidPhones[i], validCountryCodes[i]);
      expect(validPhone(invalidPhones[i], validCountryCodes[i])).toBe(false);
    }
  });

  test("Valid phones", () => {
    const validPhones = [
      "2125551234",
      "612345678",
      "5512345678",
      "437-599-4791",
    ];
    const validCountryCodes = ["US", "FR", "MX", "CA"];
    for (let i = 0; i < validPhones.length; i++) {
      // if (!validPhone(validPhones[i], validCountryCodes[i]))
      //   console.log(validPhones[i], validCountryCodes[i]);
      expect(validPhone(validPhones[i], validCountryCodes[i])).toBe(true);
    }
  });
});

describe("validEmail()", () => {
  test("Empty email", () => expect(validEmail("")).toBe(false));
  test("Invalid email", () => {
    const invalidEmails = ["alesj.com", "alesj@gmail", "@gmail.com"];
    invalidEmails.forEach((email) => expect(validEmail(email)).toBe(false));
  });

  test("Invalid length email", () => {
    const emailTooLong = "a".repeat(245) + "@example.com"; // length > 254
    const usernamePartTooLong = "a".repeat(65) + "@example.com"; // length > 64
    const domainPartTooLong = "ale@example." + "a".repeat(65); // length > 64

    expect(validEmail(emailTooLong)).toBe(false);
    expect(validEmail(usernamePartTooLong)).toBe(false);
    expect(validEmail(domainPartTooLong)).toBe(false);
  });

  test("valid emails", () => {
    const validEmails = [
      "ale@gmail.com",
      "ale@hotmail.com",
      "ale@seneca.ca",
      "ale@yahoo.com",
    ];
    validEmails.forEach((email) => expect(validEmail(email)).toBe(true));
  });
});
