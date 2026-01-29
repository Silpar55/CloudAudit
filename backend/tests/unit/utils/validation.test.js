import {
  validARN,
  validAWSAccId,
  validEmail,
  validName,
  validPassword,
  validPhone,
} from "#utils";

describe("validName()", () => {
  it("Empty name", () => {
    expect(validName("")).toBe(false);
  });
  it("Invalid name with numbers", () => {
    const invalidName = "Hell0";
    expect(validName(invalidName)).toBe(false);
  });

  it("Normal name", () => {
    const firstName = "John";
    expect(validName(firstName)).toBe(true);
  });

  it("Names with accents and some specials characters", () => {
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
  it("Empty password", () => {
    // If there is something in the array, it means there are errors
    expect(validPassword("").length > 0).toBe(true);
  });

  it("Invalid passwords", () => {
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

  it("Valid passwords", () => {
    const validPasswords = ["Passw0rd!", "11_Secret_Key!", "$Cl0udAudit"];

    validPasswords.forEach((pass) => {
      // if (validPassword(pass).length > 0 === true) console.log(pass);
      expect(validPassword(pass).length > 0).toBe(false);
    });
  });
});

describe("validPhone()", () => {
  it("Empty phone", () => {
    expect(validPhone("")).toBe(false);
  });

  it("Invalid phones", () => {
    const invalidPhones = ["1322", "437-456-abc", "111-111-11111"];
    const validCountryCodes = ["US", "FR", "MX"];

    for (let i = 0; i < invalidPhones.length; i++) {
      // if (validPhone(invalidPhones[i], validCountryCodes[i]))
      //   console.log(invalidPhones[i], validCountryCodes[i]);
      expect(validPhone(invalidPhones[i], validCountryCodes[i])).toBe(false);
    }
  });

  it("Valid phones", () => {
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
  it("Empty email", () => expect(validEmail("")).toBe(false));
  it("Invalid email", () => {
    const invalidEmails = ["alesj.com", "alesj@gmail", "@gmail.com"];
    invalidEmails.forEach((email) => expect(validEmail(email)).toBe(false));
  });

  it("Invalid length email", () => {
    const emailTooLong = "a".repeat(245) + "@example.com"; // length > 254
    const usernamePartTooLong = "a".repeat(65) + "@example.com"; // length > 64
    const domainPartTooLong = "ale@example." + "a".repeat(65); // length > 64

    expect(validEmail(emailTooLong)).toBe(false);
    expect(validEmail(usernamePartTooLong)).toBe(false);
    expect(validEmail(domainPartTooLong)).toBe(false);
  });

  it("valid emails", () => {
    const validEmails = [
      "ale@gmail.com",
      "ale@hotmail.com",
      "ale@seneca.ca",
      "ale@yahoo.com",
    ];
    validEmails.forEach((email) => expect(validEmail(email)).toBe(true));
  });
});

describe("validAWSAccId()", () => {
  it("Should handle invalid AWSAccId", () => {
    const invalidAWSACCIds = ["", "abcdefghijkl", "1234"];
    invalidAWSACCIds.forEach((acc) => expect(validAWSAccId(acc)).toBe(false));
  });

  it("Should handle valid AWSAccId", () => {
    const validAWSAccIds = ["123456789012", "012345678901"];
    validAWSAccIds.forEach((acc) => expect(validAWSAccId(acc)).toBe(true));
  });
});

describe("validARN()", () => {
  it("Should handle invalid ARNs", () => {
    const invalidARNs = [
      "aws:iam::123456789012:user/jdoe",
      "arn:aws:iam::12345678901:user/jdoe",
      "arn:aws:iam::1234567890AB:user/jdoe",
      "arn-aws-s3-mybucket",
      null,
    ];

    invalidARNs.forEach((arn) => expect(validARN(arn)).toBe(false));
  });

  it("Should handle valid ARNs", () => {
    const validARNs = [
      "arn:aws:iam::123456789012:policy/UsersManageOwnCredentials",
      "arn:aws:s3:::my-production-bucket-2024",
      "arn:aws:lambda:us-east-1:123456789012:function:my-process-service",
      "arn:aws:ec2:us-west-2:123456789012:instance/i-0abcdef1234567890",
    ];

    validARNs.forEach((arn) => expect(validARN(arn)).toBe(true));
  });
});
