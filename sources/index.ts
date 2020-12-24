// logger
import { CreateLogger } from './logger';
var logger = CreateLogger("logs");

import moment from 'moment';
logger.info(`========== ${moment().format('llll')} ==========`)

import path from 'path';

// local db
logger.info("Initializing local database");
import { verbose } from 'sqlite3';
const DB_PATH = process.env.DB_PATH || '.';
const DB_FILE = 'Data.db';
let db = new (verbose().Database)(path.join(DB_PATH, DB_FILE));

// aws
logger.info("Initializing AWS SDK");
import AWS, { AWSError } from 'aws-sdk';
AWS.config.update({ region: process.env.AWS_REGION || "ap-northeast-2" });
const ec2 = new AWS.EC2();
const targetInstance = process.env.AWS_EC2_TARGET_INSTANCE_ID || "";
if (targetInstance === "") {
    logger.error("Target EC2 instance not specified.");
    process.exitCode = 1;
    throw new Error("Target EC2 instance not specified.");
}

// discord
logger.info("Initializing Discord.js");
import { Message, Client } from 'discord.js';
import { CommandRouter } from './router';
const commandRouter: CommandRouter<Message> = new CommandRouter<Message>();
let client = new Client();
client.on('message', (msg) => {
    logger.debug(msg);
    commandRouter.route(msg.content, msg);
});

// discord message callback
const MESSAGE_SEPERATOR = /\s+|\s*[,]\s*/;
logger.info("Initializing command router");
function IsAuthorized(msg: Message) {
    return msg.member?.id === process.env.SERVER_OWNER_DISCORD_ID;
}
logger.verbose("Add 서버리스트 command");
commandRouter.add(/^서버리스트/, async (msg:Message) => {
    if (!IsAuthorized(msg)) return;
    logger.info(`${msg.member?.displayName}(${msg.member?.id}) run command(EC2.describeInstances).`);
    ec2.describeInstances({ DryRun: false, Filters: [ { Name: 'tag:Name', Values: ['CSGO'] } ] }).promise().then((result) => {
        let str = "";
        result.Reservations?.every((r) => {
            str += `Reservation(${r.ReservationId}): ${r.OwnerId}\n`;
            r.Instances?.every((i) => {
                let name = i.Tags?.find((v) => {return v.Key == "Name"})?.Value || undefined;
                str += `EC2 instance: ${name}(${i.InstanceId}) ${i.State?.Name}.\n`;
            })
            str += '\n';
        })
        msg.channel.send(str);
    }).catch((e) => {
        logger.error(e);
        msg.reply("서버리스트를 받아오는데 문제가 발생했습니다.");
    })
});
logger.verbose("Add 내전서버시작 command");
commandRouter.add(/^내전서버((구동)|(시작))/, async (msg:Message) => {
    if (!IsAuthorized(msg)) return;
    logger.info(`${msg.member?.displayName}(${msg.member?.id}) run command(EC2.startInstances).`);
    let splitedCommand = msg.content.split(MESSAGE_SEPERATOR);
    ec2.describeInstances({ DryRun: false, InstanceIds: splitedCommand.slice(1), Filters: [ { Name:'tag:Name', Values: ['CSGO'] }, { Name: 'instance-state-name', Values: ['stopped'] } ] }).promise().then((result) => {
        let instances: string[] = [];
        result.Reservations?.every((r) => {
            r.Instances?.every((i) => {
                if (i.InstanceId)
                    instances.push(i.InstanceId);
            })
        })
        ec2.startInstances({ DryRun: false, InstanceIds: instances }).promise().then(() => {
            msg.reply(`총 ${instances.length}개의 서버를 구동하였습니다.`);
        }).catch((e) => {
            logger.error(e);
            msg.reply("서버 구동에 문제가 발생했습니다.");
        });
    }).catch((e) => {
        logger.error(e);
        msg.reply("서버 구동에 문제가 발생했습니다.");
    })
});
logger.verbose("Add 내전서버정지 command");
commandRouter.add(/^내전서버정지/, async (msg:Message) => {
    if (!IsAuthorized(msg)) return;
    logger.info(`${msg.member?.displayName}(${msg.member?.id}) run command(EC2.stopInstances).`);
    let splitedCommand = msg.content.split(MESSAGE_SEPERATOR);
    ec2.describeInstances({ DryRun: false, InstanceIds: splitedCommand.slice(1), Filters: [ { Name: 'tag:Name', Values: ['CSGO'] }, { Name: 'instance-state-name', Values: ['running'] } ] }).promise().then((result) => {
        let instances: string[] = [];
        result.Reservations?.every((r) => {
            r.Instances?.every((i) => {
                if (i.InstanceId)
                    instances.push(i.InstanceId);
            })
        })
        ec2.stopInstances({ DryRun: false, InstanceIds: instances }).promise().then(() => {
            msg.reply(`총 ${instances.length}개의 서버를 정지하였습니다.`);
        }).catch((e) => {
            logger.error(e);
            msg.reply("서버 정지에 문제가 발생했습니다.");
        });
    }).catch((e) => {
        logger.error(e);
        msg.reply("서버 정지에 문제가 발생했습니다.");
    })
});

// Test service and open server
logger.info("Login to discord.");
client.login(process.env.DISCORD_TOKEN).catch((e) => {
    logger.error(e);
    process.exitCode = 1;
    throw new Error("Cannot login to discord.");
});