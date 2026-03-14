import {
  StopInstancesCommand,
  StartInstancesCommand,
} from "@aws-sdk/client-ec2";
import { createEC2Client } from "./client-factory.js";

export const stopEC2Instance = async (credentials, instanceId) => {
  const client = createEC2Client("us-east-1", credentials);
  await client.send(new StopInstancesCommand({ InstanceIds: [instanceId] }));
};

export const startEC2Instance = async (credentials, instanceId) => {
  const client = createEC2Client("us-east-1", credentials);
  await client.send(new StartInstancesCommand({ InstanceIds: [instanceId] }));
};
