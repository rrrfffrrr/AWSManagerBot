import AWS from 'aws-sdk';
import { PromiseResult } from 'aws-sdk/lib/request';
AWS.config.update({ region: process.env.AWS_REGION || "ap-northeast-2" });

const targetInstance = process.env.AWS_EC2_TARGET_INSTANCE_ID || "";

const ec2 = new AWS.EC2();

const describeParam: AWS.EC2.DescribeInstancesRequest = {
    DryRun: true,
    InstanceIds: [targetInstance],
}
const startParam: AWS.EC2.StartInstancesRequest = {
    DryRun: true,
    InstanceIds: [targetInstance]
}
const stopParam: AWS.EC2.StopInstancesRequest = {
    DryRun: true,
    InstanceIds: [targetInstance]
}

const CommandDelay = 30000;
let CommandLock = false;

function checkLocked() : boolean {
    if (CommandLock) return true;
    CommandLock = true;
    setTimeout(() => {CommandLock = false;}, CommandDelay);
    return false;
}

export function GetState() : Promise<PromiseResult<AWS.EC2.DescribeInstancesResult, AWS.AWSError>> | undefined {
    if (checkLocked()) return undefined;
    return ec2.describeInstances(describeParam).promise();
}

export function StartInstance() : Promise<PromiseResult<AWS.EC2.StartInstancesResult, AWS.AWSError>> | undefined {
    if (checkLocked()) return undefined;
    return ec2.startInstances(startParam).promise();
}

export function StopInstance() : Promise<PromiseResult<AWS.EC2.StopInstancesResult, AWS.AWSError>> | undefined {
    if (checkLocked()) return undefined;
    return ec2.stopInstances(stopParam).promise();
}