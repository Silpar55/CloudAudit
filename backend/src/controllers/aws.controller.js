import { connectAWS, disconnectAWS, getAWSAccounts } from "#services";

export async function connect(req, res, next) {
  await connectAWS();
  return res.send({ message: "/connect" });
}

export async function accounts(req, res, next) {
  await getAWSAccounts();
  return res.send({ message: "/accounts" });
}

export async function disconnect(req, res, next) {
  await disconnectAWS();
  return res.send({ message: "/disconnect" });
}
