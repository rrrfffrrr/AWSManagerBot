// logger
import { CreateLogger } from './logger';
var logger = CreateLogger("logs");

// local db
logger.info("Initializing local database");
import sqlite3 from 'sqlite3';

// aws
logger.info("Initializing AWS SDK");
import AWS from 'aws-sdk';
import { AWSError } from 'aws-sdk/lib/error'
AWS.config.update({ region: process.env.AWS_REGION || "ap-northeast-2" });
const ec2 = new AWS.EC2();
const targetInstance = process.env.AWS_EC2_TARGET_INSTANCE_ID || "";
if (targetInstance === "") {
    logger.error("Target EC2 instance not specified.");
    process.exitCode = 1;
}

// discord
logger.info("Initializing Discord.js");
import { Message, Client } from 'discord.js';
import { CommandRouter } from './router';
let client = new Client();
client.on('message', (msg) => {
    logger.debug(msg);
    commandRouter.route(msg.content, msg);
});

// discord message callback
logger.info("Initializing command router");
function IsAuthorized(msg: Message) {
    return msg.member?.id === process.env.SERVER_OWNER_DISCORD_ID;
}
const commandRouter: CommandRouter<Message> = new CommandRouter<Message>();
logger.verbose("Add 내전서버구동 command");
commandRouter.add(/^내전서버구동/, async (msg:Message) => {
    if (!IsAuthorized(msg)) return;
    logger.info(`${msg.member?.displayName}(${msg.member?.id}) has authorized.`);
    //await ec2.startInstances({ DryRun: false, InstanceIds: [targetInstance] }).promise();
});
logger.verbose("Add 내전서버정지 command");
commandRouter.add(/^내전서버정지/, async (msg:Message) => {
    if (!IsAuthorized(msg)) return;
    logger.info(`${msg.member?.displayName}(${msg.member?.id}) has authorized.`);
    //await ec2.stopInstances({ DryRun: false, InstanceIds: [targetInstance] }).promise();
});

// Test service and open server
logger.info("Test services");
ec2.describeInstances({ DryRun: true, InstanceIds: [targetInstance] }).promise().catch((e: AWSError) => {
    if (e.code === 'DryRunOperation') {
        logger.verbose("Dry run EC2.describeInstances success.");
        return ec2.startInstances({ DryRun: true, InstanceIds: [targetInstance] }).promise();
    }

    logger.error("Unexpected error while dry run EC2.describeInstances");
    logger.error(e);
    process.exitCode = 1;
}).catch((e: AWSError) => {
    if (e.code === 'DryRunOperation') {
        logger.verbose("Dry run EC2.startInstances success.");
        return ec2.stopInstances({ DryRun: true, InstanceIds: [targetInstance] }).promise();
    }

    logger.error("Unexpected error while dry run EC2.startInstances");
    logger.error(e);
    process.exitCode = 1;
}).catch((e: AWSError) => {
    if (e.code === 'DryRunOperation') {
        logger.verbose("Dry run EC2.stopInstances success.");
        return client.login(process.env.DISCORD_TOKEN);
    }

    logger.error("Unexpected error while dry run EC2.stopInstances");
    logger.error(e);
    process.exitCode = 1;
}).then(() => {
    logger.info("Server initialization has finished.");
}).catch((e) => {
    logger.error(e);
    process.exitCode = 1;
})