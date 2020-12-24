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
db.run("CREATE TABLE IF NOT EXISTS aws_db_info (\
    db_version INTEGER PRIMARY KEY\
);");
db.run("CREATE TABLE IF NOT EXISTS aws_server_commanders (\
    id INTEGER PRIMARY KEY AUTOINCREMENT,\
    discord_id TEXT UNIQUE\
);");

// aws
logger.info("Initializing AWS SDK");
import AWS, { AWSError } from 'aws-sdk';
AWS.config.update({ region: process.env.AWS_REGION || "ap-northeast-2" });
const ec2 = new AWS.EC2();

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
function IsAuthorized(msg: Message, success: Function, fail: Function | undefined = undefined) {
    if (msg.member) {
        if (msg.member.id === process.env.SERVER_OWNER_DISCORD_ID) {
            success();
            return;
        }
        db.all('SELECT * FROM aws_server_commanders WHERE discord_id = ?', [msg.member.id], (err, rows) => {
            if (!err && rows.length > 0) {
                success();
            } else if (fail) {
                fail();
            }
        });
    } else if (fail) {
        fail();
    }
}
logger.verbose("Add 관리자추가 command");
commandRouter.add(/^!관리자추가/, async (msg:Message) => {
    if (msg.member?.id !== process.env.SERVER_OWNER_DISCORD_ID) {
        logger.info(`${msg.member?.displayName}(${msg.member?.id}) try to run command(DB.addCommander) but failed.`)
        return;
    }
    msg.mentions?.members?.each((v) => {
        db.run('INSERT INTO aws_server_commanders (discord_id) VALUES (?)', [v.id], (err) => {
            if (err) {
                logger.error(err);
                return;
            }
        });
    });
});
logger.verbose("Add 관리자제거 command");
commandRouter.add(/^!관리자제거/, async (msg:Message) => {
    if (msg.member?.id !== process.env.SERVER_OWNER_DISCORD_ID) {
        logger.info(`${msg.member?.displayName}(${msg.member?.id}) try to run command(DB.removeCommander) but failed.`)
        return;
    }
    msg.mentions?.members?.each((v) => {
        db.run('DELETE FROM aws_server_commanders WHERE discord_id = ?', [v.id], (err) => {
            if (err) {
                logger.error(err);
                return;
            }
        });
    });
});
logger.verbose("Add 서버리스트 command");
commandRouter.add(/^!서버리스트/, async (msg:Message) => {
    IsAuthorized(msg, () => {
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
});
logger.verbose("Add 서버시작 command");
commandRouter.add(/^!서버((구동)|(시작))/, async (msg:Message) => {
    IsAuthorized(msg, ()=>{
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
});
logger.verbose("Add 서버정지 command");
commandRouter.add(/^!서버정지/, async (msg:Message) => {
    IsAuthorized(msg, () => {
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
});

// Test service and open server
logger.info("Login to discord.");
client.login(process.env.DISCORD_TOKEN).catch((e) => {
    logger.error(e);
    process.exitCode = 1;
    throw new Error("Cannot login to discord.");
});